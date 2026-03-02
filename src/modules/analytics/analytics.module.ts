import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

import { Person, PersonSchema } from '../person/schemas/person.schema';
import { Portfolio, PortfolioSchema } from '../portfolio/schemas/portfolio.schema';
import { PersonPortco, PersonPortcoSchema } from '../person-portco/schemas/person-portco.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: PersonPortco.name, schema: PersonPortcoSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}