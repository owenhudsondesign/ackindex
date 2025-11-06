/**
 * TypeScript types for scheduled scrapes configuration
 */

/**
 * Scraper configuration options for Apify
 */
export interface ScrapeConfig {
  /** Maximum depth for recursive crawling (1-10) */
  max_depth: number;
  /** Maximum number of pages to scrape (1-200) */
  max_pages: number;
  /** Whether to extract and process linked PDF files */
  extract_pdfs: boolean;
  /** Whether to execute JavaScript on pages (slower but more complete) */
  scrape_javascript: boolean;
  /** Whether to wait for dynamic content to load */
  wait_for_dynamic_content: boolean;
  /** Timeout per page in seconds (10-120) */
  timeout_seconds: number;
}

/**
 * Chunking configuration for text processing
 */
export interface ChunkConfig {
  /** Token size for text chunking (100-2000) */
  chunk_size: number;
  /** Token overlap between chunks (0-500) */
  chunk_overlap: number;
}

/**
 * Additional scraping options (stored as JSONB in database)
 */
export interface ScrapeOptions {
  /** CSS selectors to target specific content */
  cssSelectors?: string[];
  /** Patterns to exclude from scraping */
  excludePatterns?: string[];
  /** Custom headers for HTTP requests */
  customHeaders?: Record<string, string>;
  /** Wait time before scraping (milliseconds) */
  initialDelay?: number;
  /** Follow redirects */
  followRedirects?: boolean;
  /** Maximum redirects to follow */
  maxRedirects?: number;
  /** User agent string */
  userAgent?: string;
  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

/**
 * Complete scheduled scrape record from database
 */
export interface ScheduledScrape extends ScrapeConfig, ChunkConfig {
  id: string;
  url: string;
  title: string;
  scrape_frequency: string; // PostgreSQL INTERVAL type
  priority: number;
  status: 'active' | 'paused' | 'failed';
  next_scrape_at: string; // ISO timestamp
  last_scraped_at: string | null; // ISO timestamp
  created_by: string; // User ID
  created_at: string; // ISO timestamp
  error_count: number;
  error_message: string | null;
  metadata: Record<string, any> | null;
  scrape_options: ScrapeOptions;
}

/**
 * Input for creating a new scheduled scrape
 */
export interface CreateScheduledScrapeInput extends Partial<ScrapeConfig>, Partial<ChunkConfig> {
  url: string;
  title?: string;
  scrape_frequency?: string;
  priority?: number;
  status?: 'active' | 'paused';
  scrape_options?: ScrapeOptions;
}

/**
 * Input for updating an existing scheduled scrape
 */
export interface UpdateScheduledScrapeInput extends Partial<ScrapeConfig>, Partial<ChunkConfig> {
  id: string;
  url?: string;
  title?: string;
  scrape_frequency?: string;
  priority?: number;
  status?: 'active' | 'paused' | 'failed';
  scrape_options?: ScrapeOptions;
}

/**
 * Default configuration values
 */
export const DEFAULT_SCRAPE_CONFIG: ScrapeConfig = {
  max_depth: 2,
  max_pages: 20,
  extract_pdfs: true,
  scrape_javascript: false,
  wait_for_dynamic_content: false,
  timeout_seconds: 30,
};

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunk_size: 500,
  chunk_overlap: 50,
};

/**
 * Validation constraints
 */
export const SCRAPE_CONFIG_CONSTRAINTS = {
  max_depth: { min: 1, max: 10 },
  max_pages: { min: 1, max: 200 },
  timeout_seconds: { min: 10, max: 120 },
  chunk_size: { min: 100, max: 2000 },
  chunk_overlap: { min: 0, max: 500 },
  priority: { min: 1, max: 10 },
} as const;

/**
 * Type guard to check if a value is a valid ScrapeConfig
 */
export function isValidScrapeConfig(config: Partial<ScrapeConfig>): config is ScrapeConfig {
  return (
    typeof config.max_depth === 'number' &&
    config.max_depth >= SCRAPE_CONFIG_CONSTRAINTS.max_depth.min &&
    config.max_depth <= SCRAPE_CONFIG_CONSTRAINTS.max_depth.max &&
    typeof config.max_pages === 'number' &&
    config.max_pages >= SCRAPE_CONFIG_CONSTRAINTS.max_pages.min &&
    config.max_pages <= SCRAPE_CONFIG_CONSTRAINTS.max_pages.max &&
    typeof config.extract_pdfs === 'boolean' &&
    typeof config.scrape_javascript === 'boolean' &&
    typeof config.wait_for_dynamic_content === 'boolean' &&
    typeof config.timeout_seconds === 'number' &&
    config.timeout_seconds >= SCRAPE_CONFIG_CONSTRAINTS.timeout_seconds.min &&
    config.timeout_seconds <= SCRAPE_CONFIG_CONSTRAINTS.timeout_seconds.max
  );
}

/**
 * Type guard to check if a value is a valid ChunkConfig
 */
export function isValidChunkConfig(config: Partial<ChunkConfig>): config is ChunkConfig {
  return (
    typeof config.chunk_size === 'number' &&
    config.chunk_size >= SCRAPE_CONFIG_CONSTRAINTS.chunk_size.min &&
    config.chunk_size <= SCRAPE_CONFIG_CONSTRAINTS.chunk_size.max &&
    typeof config.chunk_overlap === 'number' &&
    config.chunk_overlap >= SCRAPE_CONFIG_CONSTRAINTS.chunk_overlap.min &&
    config.chunk_overlap <= SCRAPE_CONFIG_CONSTRAINTS.chunk_overlap.max
  );
}

/**
 * Merge partial config with defaults
 */
export function mergeWithDefaults(
  partial: Partial<ScrapeConfig & ChunkConfig>
): ScrapeConfig & ChunkConfig {
  return {
    ...DEFAULT_SCRAPE_CONFIG,
    ...DEFAULT_CHUNK_CONFIG,
    ...partial,
  };
}
