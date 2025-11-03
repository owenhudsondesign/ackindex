'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import Image from 'next/image';
import ChatInput from '@/components/ChatInput';
import ChatDialogue from '@/components/ChatDialogue';
import EmptyState from '@/components/EmptyState';
import { Message } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      console.log('Auth check result:', currentUser ? 'Logged in' : 'Not logged in');
      
      // If user is logged in, set up their role
      if (currentUser) {
        await setupUserRole(currentUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const setupUserRole = async (currentUser: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine role based on email
      let role = 'user';
      let subscriptionTier = 'free';
      let tokenLimit = 3500;
      
      if (currentUser.email === 'owenhudsondesign@gmail.com') {
        role = 'admin';
        subscriptionTier = 'premium';
        tokenLimit = 50000;
        console.log('✅ Setting up ADMIN account for:', currentUser.email);
      } else if (currentUser.email === 'hudsonowenr@gmail.com') {
        role = 'user';
        subscriptionTier = 'free';
        tokenLimit = 3500;
        console.log('✅ Setting up USER account for:', currentUser.email);
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists:', existingProfile);
        return;
      }

      // Create user profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          id: currentUser.id,
          full_name: currentUser.email === 'owenhudsondesign@gmail.com' ? 'Owen Hudson (Admin)' : 'Owen Hudson',
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionTier === 'premium' ? 'active' : 'free',
          monthly_token_limit: tokenLimit,
          role: role,
          email_updates_enabled: true,
          email_updates_frequency: 'weekly'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
      } else {
        console.log('✅ Created profile:', profile);
        console.log(`🎉 Role: ${role}, Tier: ${subscriptionTier}, Tokens: ${tokenLimit}`);
        
        if (role === 'admin') {
          console.log('🔑 You now have admin access! Visit /admin to upload URLs');
        }
      }
    } catch (error) {
      console.error('Error setting up user role:', error);
    }
  };

  const handleSubmit = async (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Get the session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('AUTHENTICATION_REQUIRED');
      }

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('AUTHENTICATION_REQUIRED');
        } else if (response.status === 429) {
          throw new Error('TOKEN_LIMIT_EXCEEDED');
        } else {
          throw new Error(data.error || 'Failed to get response from chat API');
        }
      }

      // Create assistant message with response
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || "I apologize, but I wasn't able to generate a response.",
        citations: data.citations || [],
      };

      // Replace loading message with actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        return [...filtered, assistantMessage];
      });

    } catch (error) {
      console.error('Chat error:', error);

      // Handle specific error types
      let errorContent = "I'm sorry, but I encountered an error while processing your request. Please try again later or contact support if the problem persists.";
      
      if (error instanceof Error) {
        if (error.message === 'AUTHENTICATION_REQUIRED') {
          errorContent = "🔐 **Please sign up or log in to use the chatbot.**\n\nTo ask questions about Nantucket civic documents, you'll need to create a free account. This helps us track usage and provide better service.\n\n[Sign up here](/signup) or [log in](/login) to get started!";
        } else if (error.message === 'TOKEN_LIMIT_EXCEEDED') {
          errorContent = "📊 **You've reached your monthly token limit.**\n\nFree accounts get 3,500 tokens per month (~25-30 questions). Upgrade to Premium for unlimited access!\n\n[Upgrade to Premium](/pricing) to continue asking questions.";
        } else if (error.message.includes('Token limit exceeded')) {
          errorContent = "📊 **You've reached your monthly token limit.**\n\nFree accounts get 3,500 tokens per month (~25-30 questions). Upgrade to Premium for unlimited access!\n\n[Upgrade to Premium](/pricing) to continue asking questions.";
        }
      }

      // Replace loading message with error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        citations: [],
      };

      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)] py-8 relative bg-white dark:bg-gray-900">
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(200 200 200 / 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(200 200 200 / 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            opacity: 1
          }}
        />
        <div
          className="absolute inset-0 -z-10 dark:block hidden"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            opacity: 1
          }}
        />
        <div className="w-full max-w-3xl px-4">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-ack-blue/10 dark:bg-ack-blue/20 text-ack-blue dark:text-blue-200">
              For transparent government data
            </span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            {/* Light mode logo */}
            <Image
              src="/logo.svg"
              alt="AckIndex"
              width={200}
              height={53}
              priority
              className="h-12 w-auto block dark:hidden"
            />
            {/* Dark mode logo */}
            <Image
              src="/logo-white.svg"
              alt="AckIndex"
              width={200}
              height={53}
              priority
              className="h-12 w-auto hidden dark:block"
            />
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            {/* Mobile version - Civic on second line */}
            <span className="inline md:hidden">
              <span className="text-ack-black dark:text-white">Nantucket</span>
              <br />
              <span className="text-ack-black dark:text-white">Civic Data </span>
              <span className="text-ack-blue dark:text-blue-300">Made Accessible</span>
            </span>
            {/* Desktop version - Civic Data on first line */}
            <span className="hidden md:inline">
              <span className="text-ack-black dark:text-white">Nantucket Civic Data</span>
              <br />
              <span className="text-ack-blue dark:text-blue-300">Made Accessible</span>
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-center text-ack-dark-gray dark:text-gray-300 mb-8 max-w-lg mx-auto">
            Want to know what&apos;s going on in Town? Have a question about zoning permits? AckIndex is here to help.
          </p>

          {/* Authentication Status */}
          {authLoading ? (
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span>Checking authentication...</span>
              </div>
            </div>
          ) : user ? (
            <div className="flex justify-center mb-6 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-800 dark:text-green-100 font-medium">
                    Logged in as {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Link
                    href="/account"
                    className="text-sm text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline"
                  >
                    View Account
                  </Link>
                  <span className="text-green-300 dark:text-green-600">•</span>
                  <button
                    onClick={checkAuth}
                    className="text-sm text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline"
                    title="Refresh authentication status"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-6 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-yellow-800 dark:text-yellow-100 font-medium">
                    Not logged in
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                  <Link
                    href="/signup"
                    className="text-sm text-yellow-600 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 underline font-medium"
                  >
                    Sign up
                  </Link>
                  <span>or</span>
                  <Link
                    href="/login"
                    className="text-sm text-yellow-600 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 underline font-medium"
                  >
                    log in
                  </Link>
                  <span>to use the chatbot</span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Input - only show when no messages */}
          {!hasMessages && (
            <>
              <ChatInput
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />

              {/* Helper text */}
              <p className="text-center text-xs text-ack-dark-gray dark:text-gray-400 mt-4">
                AckIndex searches through town meeting minutes, planning board documents, and public records.
              </p>
            </>
          )}

          {/* Chat Dialogue or Empty State */}
          {hasMessages ? (
            <ChatDialogue
              messages={messages}
              isVisible={hasMessages}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </PageLayout>
  );
}

