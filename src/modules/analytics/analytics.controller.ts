import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    async getOverview() {
        return this.analyticsService.getOverview();
    }

    @Get('portfolio-distribution')
    async getPortfolioDistribution() {
        return this.analyticsService.getPortfolioDistribution();
    }

    @Get('people-distribution')
    async getPeopleDistribution() {
        return this.analyticsService.getPeopleDistribution();
    }
}