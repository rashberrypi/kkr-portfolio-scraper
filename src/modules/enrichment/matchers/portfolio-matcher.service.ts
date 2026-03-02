import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../../portfolio/schemas/portfolio.schema';

@Injectable()
export class PortfolioMatcherService {
    private readonly logger = new Logger(PortfolioMatcherService.name);

    // In-memory cache: lowercase name → Portfolio doc
    private cache: Map<string, Portfolio> = new Map();
    private cacheLoaded = false;

    constructor(
        @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
    ) {}

    async loadCache() {
        if (this.cacheLoaded) return;
        const all = await this.portfolioModel.find().lean();
        for (const p of all) {
            this.cache.set(p.name.toLowerCase().trim(), p as unknown as Portfolio);
        }
        this.cacheLoaded = true;
        this.logger.log(`Portfolio cache loaded: ${this.cache.size} entries`);
    }

    /**
     * Fuzzy match a portco name from Gemini output → Portfolio doc.
     * Returns { portfolio, score } or null if no good match.
     */
    async match(rawName: string): Promise<{ portfolio: Portfolio; score: number } | null> {
        await this.loadCache();

        const needle = rawName.toLowerCase().trim();

        // 1. Exact match
        if (this.cache.has(needle)) {
            return { portfolio: this.cache.get(needle)!, score: 1.0 };
        }

        // 2. Contains match (needle contains key or key contains needle)
        let bestScore = 0;
        let bestPortfolio: Portfolio | null = null;

        for (const [key, portfolio] of this.cache) {
            const score = this.similarity(needle, key);
            if (score > bestScore) {
                bestScore = score;
                bestPortfolio = portfolio;
            }
        }

        // Threshold: 0.75 to avoid false positives
        if (bestScore >= 0.75 && bestPortfolio) {
            return { portfolio: bestPortfolio, score: bestScore };
        }

        return null;
    }

    /**
     * Create a stub Portfolio when no match is found.
     * syncStatus not present in Portfolio schema, so we just create minimal record.
     */
    async createStub(name: string, sourceGp: string): Promise<Portfolio> {
        const stub = await this.portfolioModel.findOneAndUpdate(
            { externalId: `stub:${name.toLowerCase().replace(/\s+/g, '-')}` },
            {
                $setOnInsert: {
                    name,
                    sourceGp,
                    externalId: `stub:${name.toLowerCase().replace(/\s+/g, '-')}`,
                    basics: {},
                    investment: {},
                },
            },
            { upsert: true, new: true },
        );

        // Refresh cache
        this.cache.set(name.toLowerCase().trim(), stub);
        return stub;
    }

    /** Dice coefficient for fuzzy string similarity */
    private similarity(a: string, b: string): number {
        if (a === b) return 1;
        if (a.length < 2 || b.length < 2) return 0;

        const firstBigrams = new Map<string, number>();
        for (let i = 0; i < a.length - 1; i++) {
            const bigram = a.slice(i, i + 2);
            firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
        }

        let intersectionSize = 0;
        for (let i = 0; i < b.length - 1; i++) {
            const bigram = b.slice(i, i + 2);
            const count = firstBigrams.get(bigram) ?? 0;
            if (count > 0) {
                firstBigrams.set(bigram, count - 1);
                intersectionSize++;
            }
        }

        return (2.0 * intersectionSize) / (a.length + b.length - 2);
    }
}