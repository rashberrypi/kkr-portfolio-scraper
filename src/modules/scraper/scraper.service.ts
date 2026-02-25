import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { KkrProvider } from './providers/kkr.provider';


interface KkrCompany {
  sortingName: string;
  name: string;
  url: string;
  hq: string;
  industry: string;
  region: string;
  description: string;
  yoi: string;
  assetClass: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
    private kkrProvider: KkrProvider,
  ) {}

  async syncKkr() {
    const rawResults = await this.kkrProvider.scrape() as KkrCompany[];

    for (const item of rawResults) {
      await this.portfolioModel.updateOne(
        { externalId: item.sortingName }, // Search by the unique sortingName
        { 
          $set: { 
            name: item.name, 
            sourceGp: 'KKR', //Hard-coded : change when scaling to more GPs
            website: item.url,
            basics: {
              hq: item.hq,
              industry: item.industry,
              region: item.region,
              description: item.description.replace(/<[^>]*>?/gm, '') // Cleans the HTML <p> tags
            },
            investment: {
              entryYear: parseInt(item.yoi), // Maps 'yoi' to 'entryYear'
              assetClass: item.assetClass.split(', ') // Converts string to Array
            }
          } 
        },
        { upsert: true } // Create if doesn't exist, update if it does (SMART)
      );
    }

    this.logger.log(`Successfully synced ${rawResults.length} companies from KKR`);
    return { status: 'success', imported: rawResults.length };
  }
}