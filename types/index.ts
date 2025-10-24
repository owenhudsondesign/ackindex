export type Category = 'Budget' | 'Real Estate' | 'Town Meeting' | 'Infrastructure' | 'General';

export type VisualizationType = 'bar' | 'line' | 'pie' | 'donut' | 'timeline' | 'table';

export type TrendType = 'up' | 'down' | 'stable';

export type InsightType = 'concern' | 'success' | 'neutral';

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface KeyMetric {
  label: string;
  value: string;
  trend?: TrendType;
  change_pct?: number;
}

export interface Visualization {
  type: VisualizationType;
  labels: string[];
  values: number[];
  title?: string;
  insight?: string;
  highlight_index?: number;
}

export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  impact: ImpactLevel;
}

export interface Comparison {
  title: string;
  category_a: string;
  value_a: string;
  category_b: string;
  value_b: string;
  winner: string;
}

export interface CivicEntry {
  id: string;
  title: string;
  source: string;
  category: Category;
  summary: string;
  key_metrics: KeyMetric[];
  visualizations: Visualization[];
  insights?: Insight[];
  comparisons?: Comparison[];
  notable_updates?: string[];
  plain_english_summary?: string[];
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
  insights?: Insight[];
  comparisons?: Comparison[];
  notable_updates?: string[];
  plain_english_summary?: string[];
  date_published?: string;
  document_excerpt?: string;
}
