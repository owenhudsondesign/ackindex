'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Card from '@/components/Card';
import Loading from '@/components/Loading';

interface AnalyticsOverview {
  total_queries: number;
  total_users: number;
  queries_today: number;
  queries_this_week: number;
  queries_this_month: number;
  avg_response_time_ms: number;
  success_rate: number;
  helpful_rate: number;
}

interface PopularQuery {
  query_text: string;
  query_count: number;
  avg_citations: number;
  success_rate: number;
}

interface TrendingTopic {
  topic: string;
  this_week_count: number;
  last_week_count: number;
  growth_rate: number;
}

interface PeakUsageTime {
  hour_of_day: number;
  query_count: number;
  unique_users: number;
  avg_response_time_ms: number;
}

interface MostViewedDocument {
  document_id: string;
  document_title: string;
  source_url: string;
  source_type: string;
  view_count: number;
  unique_users: number;
  last_viewed: string;
}

interface DayOfWeekUsage {
  day_of_week: number;
  day_name: string;
  query_count: number;
  avg_queries_per_day: number;
  unique_users: number;
}

interface MostReadBlog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  meeting_type: string | null;
  meeting_date: string | null;
  published_at: string;
  view_count: number | null;
  thumbnail_url: string | null;
}

interface SearchInsightsReport {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    totalQueries: number;
    uniqueUsers: number;
    avgQueriesPerUser: number;
    avgResponseTime: number;
    successRate: number;
  };
  topQueries: Array<{
    query: string;
    count: number;
    avgCitations: number;
    successRate: number;
  }>;
  topTopics: Array<{
    topic: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
  queryCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  dailyVolume: Array<{
    date: string;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [popularQueries, setPopularQueries] = useState<PopularQuery[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakUsageTime[]>([]);
  const [mostViewed, setMostViewed] = useState<MostViewedDocument[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeekUsage[]>([]);
  const [mostReadBlogs, setMostReadBlogs] = useState<MostReadBlog[]>([]);
  const [searchInsights, setSearchInsights] = useState<SearchInsightsReport | null>(null);
  const [insightsPeriod, setInsightsPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }

        const adminUser = await getAdminUser();
        if (!adminUser) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setUser(adminUser);
        await fetchAllAnalytics();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const fetchAllAnalytics = async () => {
    try {
      setError(null);

      const [overviewRes, popularRes, trendingRes, peakTimesRes, mostViewedRes, dayOfWeekRes, mostReadBlogsRes] = await Promise.all([
        fetch('/api/admin/analytics?type=overview'),
        fetch('/api/admin/analytics?type=popular&limit=10'),
        fetch('/api/admin/analytics?type=trending&limit=10'),
        fetch('/api/admin/analytics?type=peak-times&days=30'),
        fetch('/api/admin/analytics?type=most-viewed&limit=15'),
        fetch('/api/admin/analytics?type=day-of-week&days=30'),
        fetch('/api/admin/analytics?type=most-read-blogs&limit=10'),
      ]);

      if (!overviewRes.ok || !popularRes.ok || !trendingRes.ok || !peakTimesRes.ok || !mostViewedRes.ok || !dayOfWeekRes.ok || !mostReadBlogsRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const [overviewData, popularData, trendingData, peakTimesData, mostViewedData, dayOfWeekData, mostReadBlogsData] = await Promise.all([
        overviewRes.json(),
        popularRes.json(),
        trendingRes.json(),
        peakTimesRes.json(),
        mostViewedRes.json(),
        dayOfWeekRes.json(),
        mostReadBlogsRes.json(),
      ]);

      setOverview(overviewData.data);
      setPopularQueries(popularData.data || []);
      setTrendingTopics(trendingData.data || []);
      setPeakTimes(peakTimesData.data || []);
      setMostViewed(mostViewedData.data || []);
      setDayOfWeek(dayOfWeekData.data || []);
      setMostReadBlogs(mostReadBlogsData.data || []);

      // Also fetch search insights with current period
      await fetchSearchInsights(insightsPeriod);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    }
  };

  const fetchSearchInsights = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    try {
      const res = await fetch(`/api/admin/analytics?type=search-insights&period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSearchInsights(data.data);
      }
    } catch (err) {
      console.error('Error fetching search insights:', err);
    }
  };

  const handlePeriodChange = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    setInsightsPeriod(period);
    await fetchSearchInsights(period);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${insightsPeriod}&format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ackindex-search-insights-${insightsPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || '';
  };

  const getMaxQueryCount = (data: PeakUsageTime[]) => {
    return Math.max(...data.map(d => d.query_count), 1);
  };

  const getMaxDayCount = (data: DayOfWeekUsage[]) => {
    return Math.max(...data.map(d => d.query_count), 1);
  };

  const handleExportPDF = () => {
    // Generate printable HTML version
    window.print();
  };

  if (isLoading) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-7xl mx-auto flex justify-center">
            <Loading />
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (isUnauthorized) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Access Denied
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You don't have permission to access analytics.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Admin
              </button>
            </Card>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (!user) return null;

  return (
    <PageLayout>
      <Container className="py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/admin')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Admin Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Comprehensive insights into user behavior and system performance
              </p>
            </div>
            <button
              onClick={() => handleExportPDF()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Report (PDF)
            </button>
          </div>

          {error && (
            <Card className="p-6 mb-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAllAnalytics}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </Card>
          )}

          {/* Overview Stats */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Queries</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {overview.total_queries.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {overview.queries_today} today • {overview.queries_this_week} this week
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-200 dark:bg-blue-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Users</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                      {overview.total_users.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Active users
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-200 dark:bg-green-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-700 dark:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Success Rate</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      {overview.success_rate?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Queries with results
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-200 dark:bg-purple-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-700 dark:text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Avg Response</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                      {(overview.avg_response_time_ms / 1000).toFixed(2)}s
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Query response time
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-200 dark:bg-orange-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-700 dark:text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Search Insights Report - Exportable */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Search Insights Report
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {searchInsights?.period.label || 'Loading...'} • What are people searching for?
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Period Selector */}
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => handlePeriodChange(period)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        insightsPeriod === period
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : period === 'quarter' ? '90 Days' : '365 Days'}
                    </button>
                  ))}
                </div>
                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting || !searchInsights}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            {searchInsights ? (
              <div className="space-y-6">
                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{searchInsights.summary.totalQueries}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Queries</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{searchInsights.summary.uniqueUsers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Unique Users</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{searchInsights.summary.avgQueriesPerUser}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Queries/User</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{searchInsights.summary.successRate}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Success Rate</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(searchInsights.summary.avgResponseTime / 1000).toFixed(1)}s</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Avg Response</p>
                  </div>
                </div>

                {/* Two Column Layout: Categories & Top Queries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Query Categories */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Query Categories</h4>
                    <div className="space-y-2">
                      {searchInsights.queryCategories.slice(0, 8).map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <div className="w-28 text-sm text-gray-700 dark:text-gray-300 truncate">{cat.category}</div>
                          <div className="flex-grow">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-end pr-2"
                                style={{ width: `${cat.percentage}%` }}
                              >
                                {cat.percentage > 10 && (
                                  <span className="text-xs font-semibold text-white">{cat.percentage}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right">{cat.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Queries with Trends */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Top Searches</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchInsights.topQueries.slice(0, 10).map((q, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-6">#{idx + 1}</span>
                          <div className="flex-grow min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{q.query}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-cyan-600 dark:text-cyan-400">{q.count}x</span>
                            <span>{q.successRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trending Topics */}
                {searchInsights.topTopics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Trending vs Previous Period</h4>
                    <div className="flex flex-wrap gap-2">
                      {searchInsights.topTopics.map((topic, idx) => (
                        <div
                          key={idx}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                            topic.trend === 'up'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : topic.trend === 'down'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {topic.trend === 'up' && <span>↑</span>}
                          {topic.trend === 'down' && <span>↓</span>}
                          <span className="truncate max-w-[150px]">{topic.topic}</span>
                          <span className="font-semibold">
                            {topic.changePercent > 0 ? '+' : ''}{topic.changePercent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-cyan-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading search insights...</p>
              </div>
            )}
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Peak Usage Times */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Peak Usage Times
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Query volume by hour of day (last 30 days)</p>
              {peakTimes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
              ) : (
                <div className="space-y-2">
                  {peakTimes.map((time) => (
                    <div key={time.hour_of_day} className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatHour(time.hour_of_day)}
                      </div>
                      <div className="flex-grow">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-2"
                            style={{ width: `${(time.query_count / getMaxQueryCount(peakTimes)) * 100}%` }}
                          >
                            {time.query_count > 0 && (
                              <span className="text-xs font-semibold text-white">{time.query_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                        {time.unique_users} users
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Usage by Day of Week */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Usage by Day of Week
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Query patterns across the week</p>
              {dayOfWeek.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
              ) : (
                <div className="space-y-2">
                  {dayOfWeek.map((day) => (
                    <div key={day.day_of_week} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getDayName(day.day_of_week)}
                      </div>
                      <div className="flex-grow">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-2"
                            style={{ width: `${(day.query_count / getMaxDayCount(dayOfWeek)) * 100}%` }}
                          >
                            {day.query_count > 0 && (
                              <span className="text-xs font-semibold text-white">{day.query_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-24 text-xs text-gray-500 dark:text-gray-400 text-right">
                        {day.avg_queries_per_day.toFixed(1)} avg/day
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Most Viewed Meetings/Documents */}
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Most Viewed Meetings & Documents
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Content most frequently referenced in search results (last 30 days)</p>
            {mostViewed.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Rank</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Views</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Unique Users</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Last Viewed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostViewed.map((doc, idx) => (
                      <tr key={doc.document_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-md truncate">
                            {doc.document_title || 'Untitled'}
                          </div>
                          {doc.source_url && (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-md block"
                            >
                              {doc.source_url}
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.source_type === 'youtube'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          }`}>
                            {doc.source_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                          {doc.view_count}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                          {doc.unique_users}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {doc.last_viewed ? new Date(doc.last_viewed).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Most Read Blogs */}
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Most Read Blog Posts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Published meeting summaries ordered by view count</p>
            {mostReadBlogs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No blog posts published yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Rank</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Views</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostReadBlogs.map((blog, idx) => (
                      <tr key={blog.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-md">
                            {blog.title}
                          </div>
                          <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            /blog/{blog.slug}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          {blog.meeting_type && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                              {blog.meeting_type}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                          {blog.view_count ?? 0}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Popular Searches and Trending Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Popular Searches */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                Popular Searches
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Most frequently asked questions (last 30 days)</p>
              {popularQueries.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No queries yet</p>
              ) : (
                <div className="space-y-3">
                  {popularQueries.map((query, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-grow">
                          {query.query_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 ml-8 text-xs">
                        <div>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{query.query_count}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">queries</span>
                        </div>
                        <div>
                          <span className="font-semibold text-green-600 dark:text-green-400">{query.success_rate}%</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">success</span>
                        </div>
                        <div>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">{query.avg_citations}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">sources</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Trending Topics */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="text-2xl">📈</span>
                Trending Topics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Queries with increasing frequency (week-over-week)</p>
              {trendingTopics.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trending topics yet</p>
              ) : (
                <div className="space-y-3">
                  {trendingTopics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-2xl">🔥</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-grow">
                          {topic.topic}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 ml-10 text-xs">
                        <div>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{topic.this_week_count}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">this week</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">{topic.last_week_count}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">last week</span>
                        </div>
                        <div>
                          <span className={`font-bold text-lg ${topic.growth_rate > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {topic.growth_rate > 0 ? '+' : ''}{topic.growth_rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </PageLayout>
  );
}
