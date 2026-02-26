import { Controller, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) { }

  @Post('sync/kkr')
  triggerSync() {
    return this.scraperService.syncKkr();
  }

  @Post('sync/kkr/people')
  async syncPeople() {
    // We don't 'await' this so the request doesn't timeout for the user
    // The process continues in the background
    this.scraperService.syncKkrPeople();
    return { message: 'People sync started in background' };
  }
}