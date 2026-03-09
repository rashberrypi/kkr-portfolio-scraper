import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person } from '../person/schemas/person.schema';
import { PersonPortco } from '../person-portco/schemas/person-portco.schema';
import { KkrPersonScraperStrategy } from './strategies/kkr/kkr-person-scraper.strategy';
import { GeminiBioParserService, GeminiPersonResult } from './providers/gemini-bio-parser.service';
import { PortfolioMatcherService } from './matchers/portfolio-matcher.service';
import { AnyBulkWriteOperation } from 'mongodb';

@Injectable()
export class EnrichmentService {
    private readonly logger = new Logger(EnrichmentService.name);
    private readonly BATCH_SIZE = 110;
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

        if (!people.length) return { synced: 0, failed: 0 };

        // 1. First Pass (Initial Sweep)
        const { results, failedSlugs } = await this.executeBatchProcess(people, "Phase 1");

        // 2. Second Pass (Retry failures)
        if (failedSlugs.length > 0) {
            this.logger.log(`🔄 Retrying ${failedSlugs.length} failed people...`);
            const retryPeople = people.filter(p => failedSlugs.includes(p.personSlug));
            const retryPass = await this.executeBatchProcess(retryPeople, "Phase 2 (Retry)");

            // Final update for anything that STILL failed
            const stillFailed = retryPass.failedSlugs;
            if (stillFailed.length > 0) {
                await this.personModel.updateMany(
                    { personSlug: { $in: stillFailed } },
                    { $set: { syncStatus: 'enrich_failed', syncError: 'AI failed retry' } }
                );
            }
        }

        return { synced: results.size, failed: failedSlugs.length };
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
    
    private async executeBatchProcess(people: any[], label: string) {
        const results = new Map<string, GeminiPersonResult>();
        const failedSlugs: string[] = [];

        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
            const chunk = people.slice(i, i + this.BATCH_SIZE);
            const slugs = chunk.map(p => p.personSlug);

            this.logger.log(`[${label}] Batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(people.length / this.BATCH_SIZE)} processing...`);

            try {
                await this.personModel.updateMany({ personSlug: { $in: slugs } }, { $set: { syncStatus: 'enriching' } });

                const batchResults = await this.geminiParser.callGemini(chunk);

                for (const person of chunk) {
                    const parsed = batchResults.get(person.personSlug);
                    if (parsed) {
                        await this.upsertPortcoRelationships(person, parsed);
                        await this.personModel.updateOne({ personSlug: person.personSlug }, { $set: { syncStatus: 'synced', lastEnrichedAt: new Date() } });
                        results.set(person.personSlug, parsed);
                    } else {
                        failedSlugs.push(person.personSlug);
                    }
                }
            } catch (err) {
                this.logger.error(`Batch failed: ${err.message}`);
                failedSlugs.push(...slugs);
            }
            // 5 second gap to prevent rate limits
            await new Promise(r => setTimeout(r, 5000));
        }
        return { results, failedSlugs };
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