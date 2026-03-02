import { Controller, Post, Get, Query, Logger } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';

@Controller('enrichment')
export class EnrichmentController {
    private readonly logger = new Logger(EnrichmentController.name);

    constructor(private readonly enrichmentService: EnrichmentService) {}

    /** Trigger full pipeline (bio fetch + Gemini enrichment) */
    @Post('run')
    async runPipeline(@Query('gp') gp = 'KKR') {
        this.logger.log(`POST /enrichment/run?gp=${gp}`);
        // Fire and forget — don't await (1027 people takes ~15min)
        this.enrichmentService.runFullPipeline(gp).catch((err) =>
            this.logger.error(`Pipeline error: ${err.message}`),
        );
        return { status: 'started', message: 'Pipeline running in background. Check /enrichment/status for progress.' };
    }

    /** Trigger only Phase 1: bio fetching */
    @Post('run/bio-fetch')
    async runBioFetch(@Query('gp') gp = 'KKR') {
        this.enrichmentService.runBioFetchPhase(gp).catch((err) =>
            this.logger.error(`Bio fetch error: ${err.message}`),
        );
        return { status: 'started', phase: 'bio_fetch' };
    }

    /** Trigger only Phase 2: Gemini enrichment (requires bio_fetched people) */
    @Post('run/enrich')
    async runEnrich(@Query('gp') gp = 'KKR') {
        this.enrichmentService.runEnrichmentPhase(gp).catch((err) =>
            this.logger.error(`Enrichment error: ${err.message}`),
        );
        return { status: 'started', phase: 'enrichment' };
    }

    /** Get pipeline status breakdown */
    @Get('status')
    async getStatus() {
        return this.enrichmentService.getStatus();
    }
}