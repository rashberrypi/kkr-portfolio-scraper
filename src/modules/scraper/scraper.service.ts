import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { Person } from '../person/schemas/person.schema';
import { KkrProvider } from './providers/kkr.provider';
import { KkrPersonProvider } from './providers/kkr-person.provider';
import { generatePersonSlug } from '../person/utils/slugger.util';

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
    @InjectModel(Person.name) private personModel: Model<Person>, // Inject Person
    private kkrProvider: KkrProvider,
    private kkrPersonProvider: KkrPersonProvider, // Inject People Provider
  ) { }

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

  async syncKkrPeople() {
    let currentPage = 1;
    let totalPages = 1;
    let totalSynced = 0;

    this.logger.log('Starting background People sync...');

    do {
      this.logger.log(`🔄 Fetching People Page ${currentPage}...`);
      const data = await this.kkrPersonProvider.fetchPage(currentPage);

      if (currentPage === 1) totalPages = data.pages || 1;

      const bulkOps = data.results.map((p: any) => {
        // Deterministic ID: name-firm
        const masterSlug = `${generatePersonSlug(p.name)}-kkr`;

        return {
          updateOne: {
            filter: { personSlug: masterSlug },
            update: {
              $set: {
                fullName: p.name,
                currentTitle: p.title,
                officeLocation: p.city,
                primaryTeam: p.team,
                currentGp: 'KKR',
                'sources.kkrUrl': `https://www.kkr.com${p.bioPageLink}`,
                syncStatus: 'pending'
              }
            },
            upsert: true
          }
        };
      });

      if (bulkOps.length > 0) {
        await this.personModel.bulkWrite(bulkOps);
        totalSynced += bulkOps.length;
      }

      currentPage++;

      // Sequential Delay with Jitter to prevent ban
      if (currentPage <= totalPages) {
        const jitter = Math.random() * 800;
        await new Promise(resolve => setTimeout(resolve, 1200 + jitter));
      }
    } while (currentPage <= totalPages);

    this.logger.log(`✅ People Sync Complete. Total: ${totalSynced}`);
  }
  
}