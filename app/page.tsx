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
        {/* Visual anchor */}
        <div className="inline-block mb-4">
          <div className="text-6xl mb-2">🏛️</div>
          <div className="h-1 w-16 bg-ack-blue mx-auto rounded-full"></div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
          Nantucket Civic Data,<br />
          <span className="text-ack-blue">Actually Understandable</span>
        </h1>

        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-2">
          Town budgets, meeting minutes, and infrastructure updates—parsed by AI
          and presented in plain English. No more searching through PDFs.
        </p>

        {dashboardData && dashboardData.totalDocuments > 0 && (
          <p className="text-sm text-gray-500 mt-4">
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
        <div className="flex flex-col items-center justify-center py-20">
          {/* Better loading animation */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-ack-blue/20 border-t-ack-blue rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🏛️</span>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-lg">Loading civic data...</p>
          <p className="text-gray-500 text-sm mt-2">Analyzing documents and generating insights</p>
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
              className="py-12"
            >
              {/* Hero Message */}
              <div className="text-center mb-12">
                <div className="text-8xl mb-6 animate-bounce">📊</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Dashboard Coming Soon
                </h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Once civic documents are uploaded, you'll see real-time insights,
                  trend charts, and AI-powered analysis right here.
                </p>
              </div>

              {/* Preview of What's Coming */}
              <div className="max-w-5xl mx-auto">
                <h4 className="text-xl font-bold text-gray-900 mb-6 text-center">
                  What You'll See Here:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  {/* Preview Card 1 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">💰</span>
                      <h5 className="text-lg font-bold text-gray-900">Budget Insights</h5>
                    </div>
                    <div className="space-y-2 text-gray-700">
                      <p className="text-sm">• Total town budget and year-over-year changes</p>
                      <p className="text-sm">• Spending breakdown by department</p>
                      <p className="text-sm">• Tax impact analysis</p>
                    </div>
                  </div>

                  {/* Preview Card 2 */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">🏘️</span>
                      <h5 className="text-lg font-bold text-gray-900">Real Estate Data</h5>
                    </div>
                    <div className="space-y-2 text-gray-700">
                      <p className="text-sm">• Median home prices and trends</p>
                      <p className="text-sm">• Sales volume and inventory</p>
                      <p className="text-sm">• Market comparisons</p>
                    </div>
                  </div>

                  {/* Preview Card 3 */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">🏗️</span>
                      <h5 className="text-lg font-bold text-gray-900">Infrastructure Updates</h5>
                    </div>
                    <div className="space-y-2 text-gray-700">
                      <p className="text-sm">• Active construction projects</p>
                      <p className="text-sm">• Completion timelines</p>
                      <p className="text-sm">• Budget vs. actual costs</p>
                    </div>
                  </div>

                  {/* Preview Card 4 */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border-2 border-orange-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">📋</span>
                      <h5 className="text-lg font-bold text-gray-900">Town Meetings</h5>
                    </div>
                    <div className="space-y-2 text-gray-700">
                      <p className="text-sm">• Key decisions and votes</p>
                      <p className="text-sm">• Article summaries</p>
                      <p className="text-sm">• Upcoming agenda items</p>
                    </div>
                  </div>
                </div>

                {/* Example of What a Card Will Look Like */}
                <div className="mb-12">
                  <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
                    Example: How Data Will Appear
                  </h4>

                  {/* Mock Entry Card */}
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 max-w-3xl mx-auto">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          FY2026 Town Budget Analysis
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Budget
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            Town Finance Department
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      The FY2026 budget proposes a 5.2% increase over FY2025, driven primarily by
                      healthcare costs (up 59% over 5 years) and infrastructure spending. Total budget
                      of $82.3M represents $7,480 per resident...
                    </p>

                    {/* Mock Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20">
                        <p className="text-xs text-ack-gray font-medium mb-1">Total Budget</p>
                        <p className="text-lg font-semibold text-gray-900">$82.3M</p>
                      </div>
                      <div className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20">
                        <p className="text-xs text-ack-gray font-medium mb-1">YoY Increase</p>
                        <p className="text-lg font-semibold text-gray-900">5.2%</p>
                      </div>
                      <div className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20">
                        <p className="text-xs text-ack-gray font-medium mb-1">Per Resident</p>
                        <p className="text-lg font-semibold text-gray-900">$7,480</p>
                      </div>
                      <div className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20">
                        <p className="text-xs text-ack-gray font-medium mb-1">Healthcare</p>
                        <p className="text-lg font-semibold text-gray-900">↑ 59%</p>
                      </div>
                    </div>

                    {/* Mock Chart Placeholder */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-center h-32 text-gray-400">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📈</div>
                          <p className="text-sm">Interactive charts will appear here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-2xl p-8 border-2 border-ack-blue/20">
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">
                    Ready to Get Started?
                  </h4>
                  <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                    Town administrators can upload civic documents through the admin portal.
                    Our AI will automatically parse them and generate insights.
                  </p>

                  <a
                    href="/admin"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-ack-blue text-white font-semibold rounded-xl hover:bg-ack-blue/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span>🔐</span>
                    <span>Access Admin Portal</span>
                    <span>→</span>
                  </a>

                  <p className="mt-4 text-sm text-gray-600">
                    Need access? Contact your town administrator
                  </p>
                </div>
              </div>
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
