'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VideoUploadForm from '@/components/VideoUploadForm';
import BatchVideoUploadForm from '@/components/BatchVideoUploadForm';
import DropboxImportForm from '@/components/DropboxImportForm';
import UploadHistory from '@/components/UploadHistory';

export default function StaffUploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'batch' | 'dropbox'>('single');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/staff/login');
        return;
      }

      // Check if user is approved staff
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*, role')
        .eq('id', authUser.id)
        .single();

      if (!userProfile) {
        router.push('/staff/login');
        return;
      }

      // Check permissions: admin OR approved staff
      const isAdmin = userProfile.role === 'admin';
      const isApprovedStaff = userProfile.staff_approved === true;

      if (!isAdmin && !isApprovedStaff) {
        // Not authorized
        if (userProfile.staff_requested_at) {
          router.push('/staff/pending');
        } else {
          router.push('/staff/signup');
        }
        return;
      }

      setUser(authUser);
      setProfile(userProfile);

    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/staff/login');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Video Upload
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Upload meeting recordings for archiving and transcription
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-gray-500">{profile?.staff_department || 'Staff'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Upload Mode Toggle */}
        <div className="bg-white rounded-lg shadow-md p-1 inline-flex">
          <button
            onClick={() => setUploadMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Single Upload
          </button>
          <button
            onClick={() => setUploadMode('batch')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'batch'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Batch Upload
          </button>
          <button
            onClick={() => setUploadMode('dropbox')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'dropbox'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dropbox Import
          </button>
        </div>

        {uploadMode === 'single' && <VideoUploadForm />}
        {uploadMode === 'batch' && <BatchVideoUploadForm />}
        {uploadMode === 'dropbox' && <DropboxImportForm />}

        <UploadHistory />
      </div>
    </div>
  );
}
