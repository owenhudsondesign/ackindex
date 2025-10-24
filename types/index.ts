export type Category = 'Budget' | 'Real Estate' | 'Town Meeting' | 'Infrastructure' | 'General';

export type VisualizationType = 'bar' | 'line' | 'pie' | 'donut' | 'timeline' | 'table';

export interface KeyMetric {
  label: string;
  value: string;
}

export interface Visualization {
  type: VisualizationType;
  labels: string[];
  values: number[];
}

export interface CivicEntry {
  id: string;
  title: string;
  source: string;
  category: Category;
  summary: string;
  key_metrics: KeyMetric[];
  visualizations: Visualization[];
  notable_updates?: string[];
  date_published?: string;
  document_excerpt?: string;
  created_at: string;
  updated_at?: string;
}

export interface UploadFormData {
  title: string;
  category: Category;
  source: string;
  file: File;
}

export interface ParsedCivicData {
  title: string;
  source: string;
  category: Category;
  summary: string;
  key_metrics: KeyMetric[];
  visualizations: Visualization[];
  notable_updates?: string[];
  date_published?: string;
  document_excerpt?: string;
}
