'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface StaffApplication {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  department: string;
  role_title: string;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string;
  admin_notes: string;
}

export default function StaffManagementPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadApplications();
    }
  }, [filter, loading]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      // Check if admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/admin/login');
    }
  };

  const loadApplications = async () => {
    try {
      let query = supabase
        .from('staff_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!confirm('Approve this staff application?')) return;

    setProcessingId(applicationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('approve_staff_application', {
        application_id: applicationId,
        admin_user_id: user.id,
      });

      if (error) throw error;

      await loadApplications();
      alert('Staff application approved!');
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    const notes = prompt('Reason for rejection (optional):');
    if (notes === null) return; // Cancelled

    setProcessingId(applicationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('reject_staff_application', {
        application_id: applicationId,
        admin_user_id: user.id,
        notes: notes || null,
      });

      if (error) throw error;

      await loadApplications();
      alert('Staff application rejected');
    } catch (error) {
      console.error('Reject error:', error);
      alert('Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve staff video upload accounts
              </p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Admin
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setFilter('pending')}
                className={`px-6 py-3 font-medium relative ${
                  filter === 'pending'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-6 py-3 font-medium ${
                  filter === 'approved'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-6 py-3 font-medium ${
                  filter === 'rejected'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 font-medium ${
                  filter === 'all'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Applications List */}
          <div className="p-6">
            {applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {filter !== 'all' ? filter : ''} applications
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {app.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">{app.email}</p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Department</p>
                        <p className="text-sm text-gray-900">{app.department}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Role</p>
                        <p className="text-sm text-gray-900">{app.role_title}</p>
                      </div>
                    </div>

                    {app.reason && (
                      <div className="mb-3 p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Reason</p>
                        <p className="text-sm text-gray-700">{app.reason}</p>
                      </div>
                    )}

                    {app.admin_notes && (
                      <div className="mb-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700 uppercase font-medium mb-1">Admin Notes</p>
                        <p className="text-sm text-yellow-800">{app.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                      {app.reviewed_at && (
                        <span>Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={processingId === app.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          {processingId === app.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={processingId === app.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
      {status.toUpperCase()}
    </span>
  );
}
