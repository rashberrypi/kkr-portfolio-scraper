import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person } from '../person/schemas/person.schema';
import { PersonPortco } from '../person-portco/schemas/person-portco.schema';
import { KkrPersonScraperStrategy } from './strategies/kkr/kkr-person-scraper.strategy';
import { GeminiBioParserService } from './providers/gemini-bio-parser.service';
import { PortfolioMatcherService } from './matchers/portfolio-matcher.service';
import { AnyBulkWriteOperation } from 'mongodb';

@Injectable()
export class EnrichmentService {
    private readonly logger = new Logger(EnrichmentService.name);

    constructor(
        @InjectModel(Person.name) private personModel: Model<Person>,
        @InjectModel(PersonPortco.name) private personPortcoModel: Model<PersonPortco>,
        private scraper: KkrPersonScraperStrategy,
        private geminiParser: GeminiBioParserService,
        private portfolioMatcher: PortfolioMatcherService,
    ) { }

    /**
     * PHASE 1: Fetch bio HTML for all 'pending' people.
     * Updates syncStatus: pending → bio_fetching → bio_fetched | bio_failed
     */
    async runBioFetchPhase(gp = 'KKR'): Promise<{ fetched: number; failed: number }> {
        const people = await this.personModel.find({
            currentGp: gp,
            syncStatus: { $in: ['pending', 'bio_failed', 'bio_fetching'] },
            'sources.kkrUrl': { $exists: true },
        }).lean();

        if (!people.length) return { fetched: 0, failed: 0 };

        // LOCK RECORDS: Mark as bio_fetching immediately so other processes skip them
        const slugs = people.map(p => p.personSlug);
        await this.personModel.updateMany(
            { personSlug: { $in: slugs } },
            { $set: { syncStatus: 'bio_fetching' } }
        );

        const toFetch = people.map((p) => ({
            personSlug: p.personSlug,
            sourceUrl: p.sources?.kkrUrl!,
        }));

        const bioResults = await this.scraper.fetchBioBatch(toFetch);

        const bulkOps: AnyBulkWriteOperation<any>[] = Array.from(bioResults).map(([personSlug, bio]) => {
            const isSuccess = bio !== null && bio.length > 0;
            return {
                updateOne: {
                    filter: { personSlug },
                    update: isSuccess
                        ? {
                            $set: {
                                rawBiography: bio,
                                syncStatus: 'bio_fetched' as const,
                                syncError: null
                            }
                        }
                        : {
                            $set: {
                                syncStatus: 'bio_failed' as const,
                                syncError: 'Fetch failed'
                            }
                        }
                }
            };
        });
        if (bulkOps.length > 0) await this.personModel.bulkWrite(bulkOps);

        const fetched = Array.from(bioResults.values()).filter(v => !!v).length;
        return { fetched, failed: bioResults.size - fetched };
    }

    /**
     * PHASE 2: Run Gemini enrichment on all 'bio_fetched' people.
     * Updates syncStatus: bio_fetched → enriching → synced | enrich_failed
     * Creates PersonPortco junction documents.
     */
    async runEnrichmentPhase(gp = 'KKR'): Promise<{ synced: number; failed: number }> {
        const people = await this.personModel.find({
            currentGp: gp,
            syncStatus: { $in: ['bio_fetched', 'enrich_failed'] },
            rawBiography: { $exists: true, $ne: '' },
        }).lean();

        this.logger.log(`Phase 2: ${people.length} people to enrich`);
        if (!people.length) return { synced: 0, failed: 0 };

        let synced = 0;
        let failed = 0;

        const CHUNK_SIZE = 10;

        for (let i = 0; i < people.length; i += CHUNK_SIZE) {
            const chunk = people.slice(i, i + CHUNK_SIZE);
            const slugs = chunk.map(p => p.personSlug);

            // 1. Mark this specific chunk as 'enriching' (Locking)
            await this.personModel.updateMany(
                { personSlug: { $in: slugs } },
                { $set: { syncStatus: 'enriching' } }
            );

            try {
                const geminiInput = chunk.map(p => ({
                    personSlug: p.personSlug,
                    rawBiography: p.rawBiography,
                }));

                // 2. Call Gemini - If this fails, it jumps to 'catch' for this specific chunk
                const geminiResults = await this.geminiParser.parseBatch(geminiInput);

                // 3. Process results for this chunk
                for (const person of chunk) {
                    const parsed = geminiResults.get(person.personSlug);

                    const hasData = parsed && (
                        parsed.portcos?.length > 0 ||
                        parsed.boardRoles?.length > 0 ||
                        parsed.priorFirms?.length > 0 ||
                        parsed.education?.length > 0 ||
                        parsed.role !== null
                    );

                    if (!hasData) {
                        // This triggers the 'catch' block for the 10-person chunk
                        throw new Error(`Gemini returned empty or missing data for ${person.personSlug}`);
                    }

                    // Link to portcos (only runs if we have data)
                    await this.upsertPortcoRelationships(person, parsed);

                    // Mark successful ONLY if we have confirmed data
                    await this.personModel.updateOne(
                        { personSlug: person.personSlug },
                        {
                            $set: {
                                syncStatus: 'synced',
                                lastEnrichedAt: new Date(),
                                syncError: null
                            }
                        }
                    );
                    synced++;
                }
            } catch (err) {
                this.logger.error(`Batch starting with ${slugs[0]} failed: ${err.message}`);

                // 4. On failure, mark ONLY the current chunk as 'enrich_failed'
                await this.personModel.updateMany(
                    { personSlug: { $in: slugs } },
                    { $set: { syncStatus: 'enrich_failed', syncError: err.message } }
                );
                failed += chunk.length;
            }
        }

        this.logger.log(`Phase 2 complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }

    /**
     * Run both phases sequentially — the main entry point.
     */
    async runFullPipeline(gp = 'KKR') {
        this.logger.log('🚀 Starting full enrichment pipeline...');
        const phase1 = await this.runBioFetchPhase(gp);
        const phase2 = await this.runEnrichmentPhase(gp);
        this.logger.log('✅ Pipeline complete');
        return { phase1, phase2 };
    }

    private async upsertPortcoRelationships(person: any, parsed: any) {
        // Merge portco names from both portcos[] and boardRoles[]
        const allCompanyNames = new Set<string>([
            ...(parsed.portcos ?? []),
            ...(parsed.boardRoles ?? []).map((r: any) => r.company),
        ]);

        for (const companyName of allCompanyNames) {
            if (!companyName?.trim()) continue;

            // Fuzzy match → Portfolio
            let portfolioDoc: any;
            let matchScore = 1.0;

            const matchResult = await this.portfolioMatcher.match(companyName);
            if (matchResult) {
                portfolioDoc = matchResult.portfolio;
                matchScore = matchResult.score;
            } else {
                // Create stub
                portfolioDoc = await this.portfolioMatcher.createStub(companyName, person.currentGp);
                matchScore = 0.0;
                this.logger.debug(`Stub created for unmatched portco: "${companyName}"`);
            }

            // Find board role details if available
            const boardRole = parsed.boardRoles?.find(
                (r: any) => r.company?.toLowerCase() === companyName.toLowerCase(),
            );

            await this.personPortcoModel.findOneAndUpdate(
                {
                    personSlug: person.personSlug,
                    portfolioExternalId: portfolioDoc.externalId,
                },
                {
                    $set: {
                        personId: person._id,
                        portfolioId: portfolioDoc._id,
                        portfolioName: portfolioDoc.name,
                        role: boardRole?.role ?? null,
                        startDate: boardRole?.startDate ?? null,
                        endDate: boardRole?.endDate ?? null,
                        extractedBy: 'gemini',
                        matchConfidence: matchScore,
                    },
                },
                { upsert: true, new: true },
            );
        }
    }

    /** Status summary — useful for monitoring */
    async getStatus() {
        const pipeline = await this.personModel.aggregate([
            { $group: { _id: '$syncStatus', count: { $sum: 1 } } },
        ]);
        const portcoCount = await this.personPortcoModel.countDocuments();
        return { pipeline, portcoCount };
    }
}