// Chat message types
export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
  similarity?: number;
  index?: number;
  startTime?: number; // Video timestamp in seconds
  documentId?: string; // For linking to blog posts
  blogPostSlug?: string; // Slug for /blog/{slug} page
}

export interface VerificationResult {
  confidence: 'high' | 'medium' | 'low';
  isValid: boolean;
  warnings: string[];
  details: {
    citationsPresent?: boolean;
    numbersVerified?: boolean;
    quotesVerified?: boolean;
    noSpeculation?: boolean;
    factsGrounded?: boolean;
    crossModelVerified?: boolean;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
  timestamp?: Date;
  // For assistant messages - verification data for report button
  verification?: VerificationResult;
  stats?: {
    avgSimilarity: number;
  };
  queryText?: string; // The user query that this response answers
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  confidence?: number;
}

// API types for future integration
export interface ChatRequest {
  query: string;
  conversationId?: string;
}

export interface DocumentChunk {
  content: string;
  source_url: string;
  document_title: string;
  timestamp: string;
  embedding?: number[];
}
