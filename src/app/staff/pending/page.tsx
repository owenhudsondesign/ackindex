'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StaffPendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/staff/login');
        return;
      }

      // Check profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('staff_approved, staff_requested_at')
        .eq('id', user.id)
        .single();

      if (profile?.staff_approved) {
        // Approved! Redirect to upload
        router.push('/staff/upload');
        return;
      }

      // Get application details
      const { data: app } = await supabase
        .from('staff_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setApplication(app);

    } catch (error) {
      console.error('Status check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const isRejected = application?.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isRejected ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {isRejected ? (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {isRejected ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Not Approved
              </h1>
              <p className="text-gray-600 mb-4">
                Your staff access request was not approved.
              </p>
              {application?.admin_notes && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
                  <p className="text-sm text-gray-600">{application.admin_notes}</p>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                If you believe this is an error, please contact your administrator.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pending Approval
              </h1>
              <p className="text-gray-600 mb-4">
                Your staff account request is being reviewed by an administrator.
              </p>
              {application && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Department:</span>{' '}
                    <span className="text-gray-600">{application.department}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Role:</span>{' '}
                    <span className="text-gray-600">{application.role_title}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Submitted:</span>{' '}
                    <span className="text-gray-600">
                      {new Date(application.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                You'll receive an email once your account is approved. This usually takes 1-2 business days.
              </p>
            </>
          )}

          <div className="space-y-3">
            <button
              onClick={checkStatus}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Refresh Status
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="block text-sm text-blue-600 hover:text-blue-700"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
