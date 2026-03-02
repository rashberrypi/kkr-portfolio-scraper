import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentService } from './enrichment.service';
import { KkrPersonScraperStrategy } from './strategies/kkr/kkr-person-scraper.strategy';
import { GeminiBioParserService } from './providers/gemini-bio-parser.service';
import { PortfolioMatcherService } from './matchers/portfolio-matcher.service';
import { Person, PersonSchema } from '../person/schemas/person.schema';
import { PersonPortco, PersonPortcoSchema } from '../person-portco/schemas/person-portco.schema';
import { Portfolio, PortfolioSchema } from '../portfolio/schemas/portfolio.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Person.name, schema: PersonSchema },
            { name: PersonPortco.name, schema: PersonPortcoSchema },
            { name: Portfolio.name, schema: PortfolioSchema },
        ]),
    ],
    controllers: [EnrichmentController],
    providers: [
        EnrichmentService,
        KkrPersonScraperStrategy,
        GeminiBioParserService,
        PortfolioMatcherService,
    ],
    exports: [EnrichmentService],
})
export class EnrichmentModule {}