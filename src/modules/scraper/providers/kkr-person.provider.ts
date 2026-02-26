import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KkrPersonProvider {
  private readonly logger = new Logger(KkrPersonProvider.name);
  private readonly url = 'https://www.kkr.com/content/kkr/sites/global/en/about/our-people/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

  async fetchPage(page: number) {
    const response = await axios.get(this.url, {
      params: {
        page,
        sortParameter: 'name',
        sortingOrder: 'asc',
        pagePath: '/content/kkr/sites/global/en/about/our-people'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    return response.data;
  }
}