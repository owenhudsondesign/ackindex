'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface HallucinationMetrics {
  date: string;
  total_queries: number;
  queries_with_citations: number;
  queries_no_results: number;
  high_confidence_responses: number;
  medium_confidence_responses: number;
  low_confidence_responses: number;
  avg_similarity_score: number;
  verified_responses: number;
  blocked_responses: number;
  flagged_responses: number;
  confirmed_hallucinations: number;
  hallucination_rate: number;
  citation_completeness: number;
  fallback_frequency: number;
  cross_model_failures: number;
  numerical_verification_failures: number;
}

interface FlaggedResponse {
  id: string;
  query_text: string;
  response_text: string;
  citations: any[];
  flag_type: string;
  flag_reason: string;
  status: string;
  created_at: string;
  user_email: string;
  is_anonymous: boolean;
  verification_result: any;
  similarity_scores: any;
}

interface VerificationLog {
  id: string;
  query_text: string;
  response_text: string;
  is_valid: boolean;
  confidence: string;
  issues: string[];
  warnings: string[];
  citations_present: boolean;
  numbers_verified: boolean;
  no_speculation: boolean;
  facts_grounded: boolean;
  cross_model_verified: boolean;
  retrieval_similarity: number;
  num_citations: number;
  created_at: string;
}

export default function AntiHallucinationDashboard() {
  const [metrics, setMetrics] = useState<HallucinationMetrics[]>([]);
  const [flags, setFlags] = useState<FlaggedResponse[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'flags' | 'blocked'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);

    const now = new Date();
    let startDate = new Date();

    if (timeRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    // Load metrics
    const { data: metricsData } = await supabase
      .from('hallucination_metrics')
      .select('*')
      .is('hour', null) // Daily aggregates only
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (metricsData) {
      setMetrics(metricsData);
    }

    // Load ALL flagged responses (not just pending)
    const { data: flagsData } = await supabase
      .from('flagged_responses')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (flagsData) {
      setFlags(flagsData);
    }

    // Load blocked/failed verification logs
    const { data: logsData } = await supabase
      .from('verification_logs')
      .select('*')
      .eq('is_valid', false)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsData) {
      setVerificationLogs(logsData);
    }

    setLoading(false);
  };

  const updateFlagStatus = async (flagId: string, newStatus: string) => {
    const { error } = await supabase
      .from('flagged_responses')
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq('id', flagId);

    if (!error) {
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalQueries = metrics.reduce((sum, m) => sum + m.total_queries, 0);
  const totalBlocked = metrics.reduce((sum, m) => sum + m.blocked_responses, 0);
  const totalFlagged = flags.length;
  const pendingFlags = flags.filter(f => f.status === 'pending').length;
  const confirmedHallucinations = flags.filter(f => f.status === 'confirmed').length;
  const avgSimilarity = metrics.reduce((sum, m) => sum + (m.avg_similarity_score || 0), 0) / (metrics.length || 1);
  const avgCitationRate = metrics.reduce((sum, m) => sum + (m.citation_completeness || 0), 0) / (metrics.length || 1);
  const avgHighConfidence = metrics.reduce((sum, m) => sum + m.high_confidence_responses, 0) / (totalQueries || 1) * 100;

  const latestMetrics = metrics[0] || {};
  const hallucinationRate = latestMetrics.hallucination_rate || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Anti-Hallucination Dashboard</h1>

          {/* Time Range Selector */}
          <div className="flex gap-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === '30days'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Queries"
            value={totalQueries}
            subtitle={`${timeRange === 'today' ? 'Today' : `Last ${timeRange === '7days' ? '7' : '30'} days`}`}
            status="neutral"
            trend={metrics.length > 1 ? metrics[0]?.total_queries - metrics[1]?.total_queries : 0}
          />
          <MetricCard
            title="Hallucination Rate"
            value={`${hallucinationRate.toFixed(2)}%`}
            subtitle={`${confirmedHallucinations} confirmed`}
            status={hallucinationRate < 1 ? 'good' : hallucinationRate < 5 ? 'warning' : 'danger'}
          />
          <MetricCard
            title="Blocked Responses"
            value={totalBlocked}
            subtitle={`${totalQueries ? ((totalBlocked / totalQueries) * 100).toFixed(1) : 0}% of queries`}
            status={totalBlocked / totalQueries < 0.08 ? 'good' : 'warning'}
          />
          <MetricCard
            title="User Flags"
            value={totalFlagged}
            subtitle={`${pendingFlags} pending review`}
            status={pendingFlags > 10 ? 'warning' : 'good'}
            badge={pendingFlags > 0 ? `${pendingFlags} NEW` : undefined}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Citation Rate"
            value={`${avgCitationRate.toFixed(1)}%`}
            subtitle="Responses with sources"
            status={avgCitationRate > 95 ? 'good' : avgCitationRate > 85 ? 'warning' : 'danger'}
          />
          <MetricCard
            title="High Confidence"
            value={`${avgHighConfidence.toFixed(1)}%`}
            subtitle="Strong source support"
            status={avgHighConfidence > 70 ? 'good' : avgHighConfidence > 50 ? 'warning' : 'danger'}
          />
          <MetricCard
            title="Avg Similarity"
            value={`${(avgSimilarity * 100).toFixed(1)}%`}
            subtitle="Source match quality"
            status={avgSimilarity > 0.85 ? 'good' : avgSimilarity > 0.78 ? 'warning' : 'danger'}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                label="Overview"
              />
              <TabButton
                active={activeTab === 'metrics'}
                onClick={() => setActiveTab('metrics')}
                label="Metrics Over Time"
              />
              <TabButton
                active={activeTab === 'flags'}
                onClick={() => setActiveTab('flags')}
                label={`User Reports (${totalFlagged})`}
                badge={pendingFlags > 0}
              />
              <TabButton
                active={activeTab === 'blocked'}
                onClick={() => setActiveTab('blocked')}
                label={`Blocked Responses (${verificationLogs.length})`}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                metrics={metrics}
                flags={flags}
                verificationLogs={verificationLogs}
                totalQueries={totalQueries}
              />
            )}

            {activeTab === 'metrics' && (
              <MetricsTab metrics={metrics} />
            )}

            {activeTab === 'flags' && (
              <FlagsTab flags={flags} updateFlagStatus={updateFlagStatus} />
            )}

            {activeTab === 'blocked' && (
              <BlockedResponsesTab logs={verificationLogs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium whitespace-nowrap relative ${
        active
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </button>
  );
}

function OverviewTab({
  metrics,
  flags,
  verificationLogs,
  totalQueries,
}: {
  metrics: HallucinationMetrics[];
  flags: FlaggedResponse[];
  verificationLogs: VerificationLog[];
  totalQueries: number;
}) {
  const recentFlags = flags.filter(f => f.status === 'pending').slice(0, 5);
  const recentBlocked = verificationLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">System Health Overview</h2>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Verification Issues</h3>
          <div className="space-y-2">
            <StatRow
              label="Cross-Model Failures"
              value={metrics.reduce((sum, m) => sum + (m.cross_model_failures || 0), 0)}
              total={totalQueries}
            />
            <StatRow
              label="Numerical Errors"
              value={metrics.reduce((sum, m) => sum + (m.numerical_verification_failures || 0), 0)}
              total={totalQueries}
            />
            <StatRow
              label="Missing Citations"
              value={totalQueries - metrics.reduce((sum, m) => sum + m.queries_with_citations, 0)}
              total={totalQueries}
            />
          </div>
        </div>

        {/* Flag Status Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Flag Status</h3>
          <div className="space-y-2">
            <StatRow
              label="Pending Review"
              value={flags.filter(f => f.status === 'pending').length}
              color="yellow"
            />
            <StatRow
              label="Confirmed Hallucinations"
              value={flags.filter(f => f.status === 'confirmed').length}
              color="red"
            />
            <StatRow
              label="False Positives"
              value={flags.filter(f => f.status === 'false_positive').length}
              color="green"
            />
            <StatRow
              label="Fixed"
              value={flags.filter(f => f.status === 'fixed').length}
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Recent Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent User Flags */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent User Reports</h3>
          {recentFlags.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending reports</p>
          ) : (
            <div className="space-y-2">
              {recentFlags.map((flag) => (
                <div key={flag.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-yellow-800 uppercase">
                      {flag.flag_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{flag.query_text}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flag.flag_reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Blocked Responses */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Blocked Responses</h3>
          {recentBlocked.length === 0 ? (
            <p className="text-gray-500 text-sm">No blocked responses</p>
          ) : (
            <div className="space-y-2">
              {recentBlocked.map((log) => (
                <div key={log.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-red-800 uppercase">
                      {log.confidence} confidence
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{log.query_text}</p>
                  {log.issues && log.issues.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      {log.issues.length} issue{log.issues.length > 1 ? 's' : ''}: {log.issues[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  color?: 'red' | 'yellow' | 'green' | 'blue';
}) {
  const percentage = total ? ((value / total) * 100).toFixed(1) : null;

  const colorClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${color ? colorClasses[color] : 'text-gray-900'}`}>
        {value}
        {percentage && <span className="text-gray-500 ml-1">({percentage}%)</span>}
      </span>
    </div>
  );
}

function MetricsTab({ metrics }: { metrics: HallucinationMetrics[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Daily Metrics</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queries</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">High Conf</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Med Conf</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low Conf</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flagged</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Sim</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.date} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(metric.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium">{metric.total_queries}</td>
                <td className="px-4 py-3 text-sm text-green-600">{metric.high_confidence_responses}</td>
                <td className="px-4 py-3 text-sm text-yellow-600">{metric.medium_confidence_responses}</td>
                <td className="px-4 py-3 text-sm text-red-600">{metric.low_confidence_responses}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-700">{metric.blocked_responses}</td>
                <td className="px-4 py-3 text-sm">{metric.flagged_responses}</td>
                <td className="px-4 py-3 text-sm">{((metric.avg_similarity_score || 0) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlagsTab({
  flags,
  updateFlagStatus,
}: {
  flags: FlaggedResponse[];
  updateFlagStatus: (id: string, status: string) => void;
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredFlags = filterStatus === 'all'
    ? flags
    : flags.filter(f => f.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">User Reports</h2>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All ({flags.length})</option>
          <option value="pending">Pending ({flags.filter(f => f.status === 'pending').length})</option>
          <option value="confirmed">Confirmed ({flags.filter(f => f.status === 'confirmed').length})</option>
          <option value="false_positive">False Positive ({flags.filter(f => f.status === 'false_positive').length})</option>
          <option value="fixed">Fixed ({flags.filter(f => f.status === 'fixed').length})</option>
        </select>
      </div>

      {filteredFlags.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No {filterStatus !== 'all' ? filterStatus : ''} reports</p>
      ) : (
        <div className="space-y-4">
          {filteredFlags.map((flag) => (
            <div key={flag.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 bg-white rounded">
                      {flag.flag_type.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={flag.status} />
                    {flag.is_anonymous ? (
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">
                        Anonymous
                      </span>
                    ) : flag.user_email && (
                      <a
                        href={`mailto:${flag.user_email}`}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1"
                        title="Contact user"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {flag.user_email}
                      </a>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">Query: {flag.query_text}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(flag.created_at).toLocaleString()}
                </span>
              </div>

              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm text-gray-700 mb-2"><strong>AI Response:</strong></p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{flag.response_text}</p>
                {flag.citations && flag.citations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Citations: {flag.citations.length} source{flag.citations.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-sm text-gray-700 mb-1"><strong>User Report:</strong></p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{flag.flag_reason}</p>
              </div>

              {flag.verification_result && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Verification Details:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Confidence:</span>{' '}
                      <span className="font-semibold">{flag.verification_result.confidence}</span>
                    </div>
                    {flag.similarity_scores?.avgSimilarity && (
                      <div>
                        <span className="text-gray-600">Similarity:</span>{' '}
                        <span className="font-semibold">{flag.similarity_scores.avgSimilarity}%</span>
                      </div>
                    )}
                  </div>
                  {flag.verification_result.issues?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-red-600 mb-1">
                        Issues ({flag.verification_result.issues.length}):
                      </p>
                      <ul className="text-xs text-red-700 space-y-1 pl-4">
                        {flag.verification_result.issues.map((issue: string, i: number) => (
                          <li key={i} className="list-disc">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {flag.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => updateFlagStatus(flag.id, 'confirmed')}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Confirm Hallucination
                  </button>
                  <button
                    onClick={() => updateFlagStatus(flag.id, 'false_positive')}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Mark False Positive
                  </button>
                  <button
                    onClick={() => updateFlagStatus(flag.id, 'fixed')}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Mark Fixed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockedResponsesTab({ logs }: { logs: VerificationLog[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Blocked Responses (Failed Verification)</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No blocked responses</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      log.confidence === 'low' ? 'bg-red-200 text-red-800' :
                      log.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {log.confidence?.toUpperCase()} CONFIDENCE
                    </span>
                    <span className="text-xs text-gray-600">
                      Similarity: {(log.retrieval_similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Query: {log.query_text}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm text-gray-700 mb-2"><strong>Blocked Response:</strong></p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{log.response_text}</p>
              </div>

              {log.issues && log.issues.length > 0 && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Verification Issues ({log.issues.length}):
                  </p>
                  <ul className="text-sm text-red-700 space-y-1 pl-4">
                    {log.issues.map((issue, i) => (
                      <li key={i} className="list-disc">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {log.warnings && log.warnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Warnings ({log.warnings.length}):
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1 pl-4">
                    {log.warnings.map((warning, i) => (
                      <li key={i} className="list-disc">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <VerificationBadge
                  label="Citations"
                  passed={log.citations_present}
                  value={`${log.num_citations} sources`}
                />
                <VerificationBadge
                  label="Numbers"
                  passed={log.numbers_verified}
                />
                <VerificationBadge
                  label="Speculation"
                  passed={log.no_speculation}
                />
                <VerificationBadge
                  label="Cross-Model"
                  passed={log.cross_model_verified}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerificationBadge({
  label,
  passed,
  value,
}: {
  label: string;
  passed: boolean;
  value?: string;
}) {
  return (
    <div className={`p-2 rounded ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
      <div className="flex items-center gap-1 mb-1">
        <span className={passed ? 'text-green-600' : 'text-red-600'}>
          {passed ? '✓' : '✗'}
        </span>
        <span className="font-semibold text-gray-700">{label}</span>
      </div>
      {value && <p className="text-gray-600">{value}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-red-100 text-red-800 border-red-300',
    false_positive: 'bg-green-100 text-green-800 border-green-300',
    fixed: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded border ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  status,
  trend,
  badge,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  trend?: number;
  badge?: string;
}) {
  const statusColors = {
    good: 'border-green-500 bg-green-50',
    warning: 'border-yellow-500 bg-yellow-50',
    danger: 'border-red-500 bg-red-50',
    neutral: 'border-gray-300 bg-white',
  };

  return (
    <div className={`border-l-4 ${statusColors[status]} p-6 rounded-lg shadow relative`}>
      {badge && (
        <span className="absolute top-2 right-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
          {badge}
        </span>
      )}
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
