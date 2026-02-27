import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ScraperService } from './scraper.service';
import { KkrProvider } from './providers/kkr.provider';
import { ScraperController } from './scraper.controller';
import { PersonModule } from '../person/person.module';
import { KkrPersonProvider } from './providers/kkr-person.provider';

@Module({
  imports: [PortfolioModule, PersonModule],
  controllers: [ScraperController],
  providers: [ScraperService, KkrProvider, KkrPersonProvider],
})
export class ScraperModule {}