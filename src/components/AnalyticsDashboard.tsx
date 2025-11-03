'use client';

import { useEffect, useState } from 'react';
import Card from './Card';
import Loading from './Loading';

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

interface UserAnalytic {
  user_id: string;
  user_email: string;
  subscription_tier: string;
  query_count: number;
  last_query: string;
  avg_citations: number;
  total_tokens: number;
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'popular' | 'trending' | 'users'>('overview');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [popularQueries, setPopularQueries] = useState<PopularQuery[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [overviewRes, popularRes, trendingRes, usersRes] = await Promise.all([
        fetch('/api/admin/analytics?type=overview'),
        fetch('/api/admin/analytics?type=popular&limit=10'),
        fetch('/api/admin/analytics?type=trending&limit=10'),
        fetch('/api/admin/analytics?type=users&limit=20'),
      ]);

      if (!overviewRes.ok || !popularRes.ok || !trendingRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const [overviewData, popularData, trendingData, usersData] = await Promise.all([
        overviewRes.json(),
        popularRes.json(),
        trendingRes.json(),
        usersRes.json(),
      ]);

      setOverview(overviewData.data);
      setPopularQueries(popularData.data || []);
      setTrendingTopics(trendingData.data || []);
      setUserAnalytics(usersData.data || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex justify-center">
          <Loading />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Queries</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                  {overview.total_queries.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {overview.queries_today} today
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

      {/* Tabs */}
      <Card className="p-6">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('popular')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'popular'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              🔥 Popular Searches
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'trending'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              📈 Trending Topics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              👥 User Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'popular' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Most Popular Searches (Last 30 Days)
            </h3>
            {popularQueries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No queries yet</p>
            ) : (
              popularQueries.map((query, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-grow">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {query.query_text}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-blue-600 dark:text-blue-400">{query.query_count}</p>
                      <p className="text-gray-500 dark:text-gray-400">queries</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600 dark:text-green-400">{query.success_rate}%</p>
                      <p className="text-gray-500 dark:text-gray-400">success</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600 dark:text-purple-400">{query.avg_citations}</p>
                      <p className="text-gray-500 dark:text-gray-400">sources</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trending Topics (Week-over-Week Growth)
            </h3>
            {trendingTopics.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trending topics yet</p>
            ) : (
              trendingTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex-grow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔥</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {topic.topic}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-orange-600 dark:text-orange-400">{topic.this_week_count}</p>
                      <p className="text-gray-500 dark:text-gray-400">this week</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-600 dark:text-gray-400">{topic.last_week_count}</p>
                      <p className="text-gray-500 dark:text-gray-400">last week</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-lg ${topic.growth_rate > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {topic.growth_rate > 0 ? '+' : ''}{topic.growth_rate}%
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">growth</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              User Analytics (Top 20 Most Active)
            </h3>
            {userAnalytics.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No user data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Tier</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Queries</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Tokens</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Avg Sources</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Last Query</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAnalytics.map((user, idx) => (
                      <tr key={user.user_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {user.user_email}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.subscription_tier === 'premium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {user.subscription_tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100 font-semibold">
                          {user.query_count}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                          {user.total_tokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                          {user.avg_citations}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {user.last_query ? new Date(user.last_query).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
