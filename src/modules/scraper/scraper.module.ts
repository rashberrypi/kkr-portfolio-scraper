import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ScraperService } from './scraper.service';
import { KkrProvider } from './providers/kkr.provider';
import { ScraperController } from './scraper.controller';

@Module({
  imports: [PortfolioModule],
  controllers: [ScraperController],
  providers: [ScraperService, KkrProvider],
})
export class ScraperModule {}