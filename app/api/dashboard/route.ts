import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CivicEntry, Insight, Visualization } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface AggregatedMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  change_pct?: number;
  category: string;
}

interface DashboardData {
  metrics: AggregatedMetric[];
  insights: Insight[];
  visualizations: Visualization[];
  totalDocuments: number;
  lastUpdated: string;
}

export async function GET() {
  try {
    // Fetch all civic entries
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        metrics: [],
        insights: [],
        visualizations: [],
        totalDocuments: 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Aggregate metrics from all entries
    const allMetrics: AggregatedMetric[] = [];
    const metricsMap = new Map<string, AggregatedMetric>();

    entries.forEach((entry: any) => {
      if (entry.key_metrics && Array.isArray(entry.key_metrics)) {
        entry.key_metrics.forEach((metric: any) => {
          const key = `${metric.label}-${entry.category}`;

          // If we already have this metric, keep the one with trend data
          if (!metricsMap.has(key)) {
            metricsMap.set(key, {
              label: metric.label,
              value: metric.value,
              trend: metric.trend,
              change_pct: metric.change_pct,
              category: entry.category,
            });
          }
        });
      }
    });

    // Convert map to array and limit to top 8 metrics
    const aggregatedMetrics = Array.from(metricsMap.values()).slice(0, 8);

    // Aggregate insights from all entries and rank by impact
    const allInsights: Insight[] = [];
    entries.forEach((entry: any) => {
      if (entry.insights && Array.isArray(entry.insights)) {
        allInsights.push(...entry.insights);
      }
    });

    // Sort insights by impact (high > medium > low) and type (concern > neutral > success)
    const impactWeight = { high: 3, medium: 2, low: 1 };
    const typeWeight = { concern: 3, neutral: 2, success: 1 };

    const sortedInsights = allInsights.sort((a, b) => {
      const impactDiff = impactWeight[b.impact as keyof typeof impactWeight] - impactWeight[a.impact as keyof typeof impactWeight];
      if (impactDiff !== 0) return impactDiff;
      return typeWeight[b.type as keyof typeof typeWeight] - typeWeight[a.type as keyof typeof typeWeight];
    });

    // Take top 3 insights
    const topInsights = sortedInsights.slice(0, 3);

    // Aggregate visualizations (line and bar charts only for trends)
    const allVisualizations: Visualization[] = [];
    entries.forEach((entry: any) => {
      if (entry.visualizations && Array.isArray(entry.visualizations)) {
        const trendCharts = entry.visualizations.filter(
          (viz: Visualization) =>
            viz.type === 'line' ||
            viz.type === 'timeline' ||
            viz.type === 'bar'
        );
        allVisualizations.push(...trendCharts);
      }
    });

    // Limit to top 3-5 visualizations
    const topVisualizations = allVisualizations.slice(0, 5);

    // Get the most recent update timestamp
    const lastUpdated = entries[0].created_at;

    const dashboardData: DashboardData = {
      metrics: aggregatedMetrics,
      insights: topInsights,
      visualizations: topVisualizations,
      totalDocuments: entries.length,
      lastUpdated,
    };

    return NextResponse.json(dashboardData);

  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
