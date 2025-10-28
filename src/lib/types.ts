// Chat message types
export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
  similarity?: number;
  index?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
  timestamp?: Date;
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
