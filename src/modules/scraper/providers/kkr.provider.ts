import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KkrProvider {
  private readonly logger = new Logger(KkrProvider.name);
  private readonly baseUrl = 'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

  async scrape() {
    this.logger.log('🚀 Starting KKR data sync...');
    let allResults: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        this.logger.log(`📥 Fetching page ${currentPage} of ${totalPages}...`);

        const response = await axios.get(this.baseUrl, {
          params: {
            page: currentPage,
            sortParameter: 'name',
            sortingOrder: 'asc'
          }
        });

        const data = response.data;

        // Set total pages from the API response on the first call
        if (currentPage === 1) {
          totalPages = data.pages || 1;
          const totalHits = data.hits || 0;
          this.logger.log(`✅ Found ${totalHits} total items across ${totalPages} pages.`);
        }

        if (data.results && Array.isArray(data.results)) {
          allResults.push(...data.results);
        }

        currentPage++;

      } while (currentPage <= totalPages);

      this.logger.log(`✨ Successfully collected ${allResults.length} companies from KKR.`);
      return allResults;

    } catch (error) {
      this.logger.error(`❌ Error scraping KKR: ${error.message}`);
      throw error;
    }
  }
}