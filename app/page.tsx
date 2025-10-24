'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ChatBot from '@/components/ChatBot';
import KeyMetricsDashboard from '@/components/KeyMetricsDashboard';
import TopInsights from '@/components/TopInsights';
import TrendCharts from '@/components/TrendCharts';
import { Insight, Visualization } from '@/types';

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

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard');

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="container-custom py-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          AckIndex
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-2">
          Your civic intelligence dashboard for Nantucket
        </p>
        {dashboardData && (
          <p className="text-sm text-gray-500">
            {dashboardData.totalDocuments} documents analyzed • Last updated {formatDate(dashboardData.lastUpdated)}
          </p>
        )}
      </motion.div>

      {/* ChatBot - The Centerpiece */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-16"
      >
        <ChatBot />
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-ack-blue"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <p className="text-red-800">
            Failed to load dashboard data: {error}
          </p>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && dashboardData && (
        <>
          {/* Key Metrics Dashboard */}
          {dashboardData.metrics && dashboardData.metrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-16"
            >
              <KeyMetricsDashboard metrics={dashboardData.metrics} />
            </motion.div>
          )}

          {/* Top Insights */}
          {dashboardData.insights && dashboardData.insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-16"
            >
              <TopInsights insights={dashboardData.insights} />
            </motion.div>
          )}

          {/* Trend Charts */}
          {dashboardData.visualizations && dashboardData.visualizations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-16"
            >
              <TrendCharts visualizations={dashboardData.visualizations} />
            </motion.div>
          )}

          {/* Empty State */}
          {dashboardData.totalDocuments === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-200"
            >
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No Documents Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Upload your first civic document to start building your intelligence dashboard.
              </p>
              <a
                href="/upload"
                className="inline-block bg-ack-blue text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Upload Document
              </a>
            </motion.div>
          )}
        </>
      )}

      {/* Data Transparency Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 p-6 bg-gray-50 rounded-xl border border-gray-200"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          About This Data
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          AckIndex uses AI to analyze civic documents from Nantucket town government.
          All data is extracted from official public records. Insights are generated to help
          citizens understand complex civic information. Always verify important details with
          official sources.
        </p>
        {dashboardData && dashboardData.totalDocuments > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Currently tracking {dashboardData.totalDocuments} document{dashboardData.totalDocuments !== 1 ? 's' : ''} across
            budgets, real estate, town meetings, infrastructure, and general civic matters.
          </p>
        )}
      </motion.div>
    </div>
  );
}
