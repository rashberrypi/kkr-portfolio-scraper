// modules/enrichment/providers/gemini-bio-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GeminiPersonResult {
    personSlug: string;
    portcos: string[];
    role: string | null;
    priorFirms: string[];
    education: string[];
    boardRoles: Array<{ company: string; role: string; startDate?: string; endDate?: string; }>;
}

@Injectable()
export class GeminiBioParserService {
    private readonly logger = new Logger(GeminiBioParserService.name);
    private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

    constructor(private configService: ConfigService) { }

    async callGemini(batch: Array<{ personSlug: string; rawBiography: string }>): Promise<Map<string, GeminiPersonResult>> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        const prompt = this.buildPrompt(batch);

        const response = await axios.post(
            this.apiUrl,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0, responseMimeType: 'application/json' },
            },
            { 
                timeout: 300000, 
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey } 
            }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        const parsed = JSON.parse(text);

        const resultsMap = new Map<string, GeminiPersonResult>();
        for (const person of batch) {
            const data = parsed[person.personSlug];
            if (data) {
                resultsMap.set(person.personSlug, {
                    personSlug: person.personSlug,
                    portcos: data.portcos ?? [],
                    role: data.role ?? null,
                    priorFirms: data.priorFirms ?? [],
                    education: data.education ?? [],
                    boardRoles: data.boardRoles ?? [],
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
}