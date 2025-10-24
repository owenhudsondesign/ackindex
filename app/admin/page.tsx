'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useFetchEntries } from '@/hooks/useEntries';
import UploadForm from '@/components/UploadForm';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { entries, refresh } = useFetchEntries();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // For MVP: simple password check
      // In production, use Supabase Auth properly
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@ackindex.com', // Configure this in Supabase
        password: password,
      });

      if (error) {
        setError('Invalid credentials');
        return;
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-ack-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ack-blue/10 to-ack-sand/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200"
        >
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
            <p className="text-gray-600">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-ack-blue hover:bg-ack-blue/90 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-ack-blue hover:text-ack-blue/80">
              ← Back to Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Upload and manage civic documents</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div>
          <UploadForm onUploadSuccess={refresh} />
        </div>

        {/* Recent Uploads */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Uploads</h2>

            {entries && entries.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-ack-blue transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{entry.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <span className="px-2 py-1 bg-gray-100 rounded-md">{entry.category}</span>
                      <span>•</span>
                      <span>{entry.source}</span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-gray-600">No documents uploaded yet</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
