import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { GpPersonScraper } from '../gp-person-scraper.interface';

@Injectable()
export class KkrPersonScraperStrategy implements GpPersonScraper {
    private readonly logger = new Logger(KkrPersonScraperStrategy.name);

    private readonly CONCURRENCY = 3;
    private readonly BASE_DELAY_MS = 1500;
    private readonly MAX_RETRIES = 3;

    async fetchBio(sourceUrl: string): Promise<string> {
        let lastError: Error = new Error('Unknown error');

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const response = await axios.get(sourceUrl, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml',
                    },
                    timeout: 15000,
                });

                const html: string = response.data;
                const match = html.match(
                    /<div[^>]*class="[^"]*cmp-bio-card-description[^"]*"[^>]*>([\s\S]*?)<\/div>/,
                );

                if (match?.[1]) {
                    return match[1].replace(/<[^>]*>/g, '').trim();
                }

                this.logger.error(`Selector not found for: ${sourceUrl}`);
                return null as any;
            } catch (err) {
                lastError = err;
                const isLast = attempt === this.MAX_RETRIES;
                const backoff = Math.pow(3, attempt) * 1000;
                this.logger.warn(
                    `[Attempt ${attempt}/${this.MAX_RETRIES}] ${sourceUrl}: ${err.message}${isLast ? ' — giving up' : ` — retry in ${backoff}ms`}`,
                );
                if (!isLast) await this.sleep(backoff);
            }
        }

        throw lastError;
    }

    async fetchBioBatch(
        people: Array<{ personSlug: string; sourceUrl: string }>,
    ): Promise<Map<string, string | null>> {
        const results = new Map<string, string | null>();
        const queue = [...people];
        const total = people.length;
        let completed = 0;

        // Use a Worker pattern instead of recursion
        const worker = async () => {
            while (queue.length > 0) {
                const person = queue.shift();
                if (!person) break;

                try {
                    const bio = await this.fetchBio(person.sourceUrl);
                    results.set(person.personSlug, bio);
                    completed++;
                    this.logger.log(`✅ [${completed}/${total}] Bio fetched: ${person.personSlug}`);
                } catch (err) {
                    results.set(person.personSlug, null);
                    completed++;
                    this.logger.warn(`❌ [${completed}/${total}] Bio failed: ${person.personSlug} — ${err.message}`);
                }

                // Small delay to prevent rate-limiting
                if (queue.length > 0) {
                    await this.sleep(this.BASE_DELAY_MS + Math.random() * 800);
                }
            }
        };

        // Run 3 workers in parallel
        await Promise.all(
            Array(Math.min(this.CONCURRENCY, total))
                .fill(null)
                .map(() => worker())
        );

        return results;
    }

    private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}