/**
 * Strategy interface for scraping bio pages from any GP (General Partner).
 *
 * Every GP scraper (KKR, Apollo, Carlyle, etc.) must implement this interface.
 * The EnrichmentService depends on this abstraction — not on any concrete class —
 * so adding a new GP is just: implement interface → register in module.
 */
export interface GpPersonScraper {
    /**
     * Fetch and return the plain-text biography for a single person.
     * @param sourceUrl  The GP's bio page URL for this person
     * @returns          Raw biography text (HTML stripped), or throws on failure
     */
    fetchBio(sourceUrl: string): Promise<string>;

    /**
     * Fetch bios for a batch of people with concurrency + jitter built in.
     * Returns a map of personSlug → biography text (null if fetch failed).
     */
    fetchBioBatch(
        people: Array<{ personSlug: string; sourceUrl: string }>
    ): Promise<Map<string, string | null>>;
}

/** Injection token — use this instead of the class to keep things loosely coupled */
export const GP_PERSON_SCRAPER = Symbol('GpPersonScraper');