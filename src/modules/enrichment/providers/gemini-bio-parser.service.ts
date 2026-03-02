import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { response } from 'express';

export interface GeminiPersonResult {
    personSlug: string;
    portcos: string[];
    role: string | null;
    priorFirms: string[];
    education: string[];
    boardRoles: Array<{
        company: string;
        role: string;
        startDate?: string;
        endDate?: string;
    }>;
}

@Injectable()
export class GeminiBioParserService {
    private readonly logger = new Logger(GeminiBioParserService.name);

    // ADJUSTED FOR STABILITY
    private readonly BATCH_SIZE = 10;           // Smaller batches prevent timeouts
    private readonly CONCURRENCY = 3;          // 3 workers running in parallel
    private readonly DELAY_BETWEEN_BATCHES_MS = 1000;
    private readonly MAX_RETRIES = 3;

    private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

    constructor(private configService: ConfigService) { }

    async parseBatch(
        people: Array<{ personSlug: string; rawBiography: string }>,
    ): Promise<Map<string, GeminiPersonResult>> {
        const results = new Map<string, GeminiPersonResult>();
        const totalPeople = people.length;
        let processedCount = 0;

        // 1. Create batches
        const batches: Array<Array<{ personSlug: string; rawBiography: string }>> = [];
        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
            batches.push(people.slice(i, i + this.BATCH_SIZE));
        }

        const totalBatches = batches.length;
        this.logger.log(`🚀 Starting Gemini Enrichment: ${totalPeople} people in ${totalBatches} batches (Concurrency: ${this.CONCURRENCY})`);

        // 2. Define Worker Logic
        const worker = async () => {
            while (batches.length > 0) {
                const batch = batches.shift();
                if (!batch) break;

                const batchResults = await this.callGeminiWithRetry(batch);

                // Merge results and log progress
                for (const [slug, result] of batchResults) {
                    results.set(slug, result);
                    processedCount++;
                }

                this.logger.log(`📦 Progress: ${processedCount}/${totalPeople} processed (${results.size} successful)`);
                await this.sleep(this.DELAY_BETWEEN_BATCHES_MS);
            }
        };

        // 3. Run Workers in Parallel
        await Promise.all(
            Array(Math.min(this.CONCURRENCY, totalBatches))
                .fill(null)
                .map(() => worker())
        );

        this.logger.log(`🎉 Gemini parsing complete — ${results.size} total results returned`);
        return results;
    }

    private async callGeminiWithRetry(
        batch: Array<{ personSlug: string; rawBiography: string }>,
    ): Promise<Map<string, GeminiPersonResult>> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await this.callGemini(batch);
            } catch (err) {
                lastError = err;
                const backoff = Math.pow(2, attempt) * 1000;
                this.logger.warn(`⚠️ Batch failed (Attempt ${attempt}/${this.MAX_RETRIES}): ${err.message}. Retrying in ${backoff}ms...`);
                if (attempt < this.MAX_RETRIES) await this.sleep(backoff);
            }
        }

        this.logger.error(`Gemini batch failed permanently for ${batch.length} people`);       
        throw new Error('Gemini API reached max retries or returned invalid status');
    }

    private async callGemini(batch: Array<{ personSlug: string; rawBiography: string }>): Promise<Map<string, GeminiPersonResult>> {

        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing in environment variables');
        }

        const prompt = this.buildPrompt(batch);
        let response: any;

        try {
            response = await axios.post(
                this.apiUrl,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: 'application/json',
                    },
                },
                {
                    timeout: 90000,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': apiKey,
                    },
                }
            );
        } catch (error) {
            if (error.response) {
                // Log the actual "message" from Google's error payload
                this.logger.error(`Gemini 400 Detail: ${JSON.stringify(error.response.data)}`);
            }
            throw error; // Re-throw so your retry logic/main loop knows it failed
        }

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        const parsed = JSON.parse(text);

        const resultsMap = new Map<string, GeminiPersonResult>();
        for (const person of batch) {
            const data = parsed[person.personSlug];

            if (data) {
                resultsMap.set(person.personSlug, {
                    personSlug: person.personSlug,
                    portcos: data?.portcos ?? [],
                    role: data?.role ?? null,
                    priorFirms: data?.priorFirms ?? [],
                    education: data?.education ?? [],
                    boardRoles: data?.boardRoles ?? [],
                });
            }
        }

        return resultsMap;
    }

    private buildPrompt(batch: Array<{ personSlug: string; rawBiography: string }>): string {
        const biographies = batch
            .map((p) => `--- SLUG: ${p.personSlug} ---\n${p.rawBiography.replace(/[\n\r\t]+/g, ' ').slice(0, 2000)}`)
            .join('\n\n');

        return `Extract professional data for these ${batch.length} people. 
Return a JSON object where keys are the personSlugs.

Schema per person:
{
  "portcos": string[],
  "role": string | null,
  "priorFirms": string[],
  "education": string[],
  "boardRoles": [
    {
      "company": string,
      "role": string,       // e.g. "Board Member" or "Director"
      "startDate": string,  // extract if mentioned, else null
      "endDate": string     // extract if mentioned, else null
    }
  ]
}

Rules:
- Include mentioned portfolio companies in "portcos".
- If they sit on a board, include that company in both "portcos" and "boardRoles".
- Return ONLY valid JSON.

BIOGRAPHIES:
${biographies}`;
    }

    private createEmptyResult(slug: string): GeminiPersonResult {
        return { personSlug: slug, portcos: [], role: null, priorFirms: [], education: [], boardRoles: [] };
    }

    private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}