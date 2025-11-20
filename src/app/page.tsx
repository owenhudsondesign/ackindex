'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import Header from '@/components/Header';
import Image from 'next/image';
import ChatInput from '@/components/ChatInput';
import ChatDialogue from '@/components/ChatDialogue';
import EmptyState from '@/components/EmptyState';
import ConversationSidebar from '@/components/ConversationSidebar';
import { Message } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { organizationSchema, breadcrumbSchema, faqSchema, localBusinessSchema } from './metadata';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [isPremium, setIsPremium] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger sidebar refresh
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar open/collapsed state (default: closed)

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

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

      // Determine role and tier based on email
      let tokenLimit = 15000;

      if (currentUser.email === 'owenhudsondesign@gmail.com') {
        role = 'admin';
        subscriptionTier = 'premium';
        tokenLimit = 500000;
      } else if (currentUser.email === 'hudsonowenr@gmail.com') {
        role = 'user';
        subscriptionTier = 'free';
        tokenLimit = 15000;
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (existingProfile) {
        // Update isPremium state
        setIsPremium(existingProfile.subscription_tier === 'premium');

        // If this is an admin account, ensure it's set to premium
        if (currentUser.email === 'owenhudsondesign@gmail.com' && existingProfile.subscription_tier !== 'premium') {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_tier: 'premium',
              subscription_status: 'active',
              monthly_token_limit: 500000,
              role: 'admin'
            })
            .eq('id', currentUser.id);

          if (!updateError) {
            setIsPremium(true);
          }
        }

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
        setIsPremium(subscriptionTier === 'premium');
      }
    } catch (error) {
      console.error('Error setting up user role:', error);
    }
  };

  const handleSubmit = async (message: string) => {
    // Open sidebar when user submits a question (so they see where to create new chat)
    setIsSidebarOpen(true);

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
          conversationId: currentConversationId, // Include current conversation ID
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

      // Update conversation ID if premium user
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
        // Trigger sidebar refresh after a brief delay to ensure DB has committed
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
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
          errorContent = "📊 **You've reached your monthly token limit.**\n\nFree accounts get 50,000 tokens per month (~35-50 questions). Upgrade to Premium for unlimited access!\n\n[Upgrade to Premium](/pricing) to continue asking questions.";
        } else if (error.message.includes('Token limit exceeded')) {
          errorContent = "📊 **You've reached your monthly token limit.**\n\nFree accounts get 50,000 tokens per month (~35-50 questions). Upgrade to Premium for unlimited access!\n\n[Upgrade to Premium](/pricing) to continue asking questions.";
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

  // Note: Message change tracking removed to reduce console noise

  // Conversation management handlers
  const handleNewConversation = () => {
    setCurrentConversationId(undefined);
    setMessages([]);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`);

      if (response.ok) {
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            citations: msg.citations || [],
          }));

          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to load conversation:', response.status, errorData);
        alert(`Failed to load conversation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Exception loading conversation:', error);
      alert('Exception loading conversation - check console for details');
    } finally {
      setIsLoading(false);
    }
  };

  // Chat content (without PageLayout wrapper when messages exist)
  const chatContent = (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <div className="flex flex-1 overflow-hidden">
      {/* Conversation Sidebar - Always visible (shows upgrade for non-premium) */}
      {isSidebarOpen && (
        <div className="hidden lg:block transition-all duration-300">
          <ConversationSidebar
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            isPremium={isPremium}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-gray-900">
        {/* Sidebar Toggle Button - Always visible on desktop */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`hidden lg:flex fixed top-20 z-50 items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            isSidebarOpen ? 'left-[272px]' : 'left-4'
          }`}
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isSidebarOpen ? (
              // Chevron left icon (collapse)
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
              // Chevron right icon (expand)
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>
        {/* Subtle Grid Background - Light Mode */}
        <div
          className="absolute inset-0 block dark:hidden pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(200 200 200 / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(200 200 200 / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 100% 100%',
            backgroundPosition: '0 0, 0 0, center',
            zIndex: 0
          }}
        />
        {/* Subtle Grid Background - Dark Mode */}
        <div
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 100% 100%',
            backgroundPosition: '0 0, 0 0, center',
            zIndex: 0
          }}
        />
        {/* Empty State - Landing page content (centered when no messages) */}
        {!hasMessages && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-3xl relative z-10">
              {/* Badge */}
              <div className="flex justify-center mb-8">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-ack-blue/10 dark:bg-ack-blue/20 text-ack-blue dark:text-blue-200 text-center">
                  Making Local Government Accessible to Everyone
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
                {/* Mobile version */}
                <span className="inline md:hidden">
                  <span className="text-gray-900 dark:text-white">Ask Questions</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">About Town Meetings</span>
                  <br />
                  <span className="text-ack-blue dark:text-blue-300">In Any Language</span>
                </span>
                {/* Desktop version */}
                <span className="hidden md:inline">
                  <span className="text-gray-900 dark:text-white">Ask Questions About Town Meetings </span>
                  <span className="text-ack-blue dark:text-blue-300">In Any Language</span>
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-center text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                AI-powered civic engagement platform for Nantucket. Get instant answers about meetings, decisions, and votes — with exact timestamps and source citations. Available in English, Spanish, Portuguese, and 100+ languages.
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

              {/* Chat Input */}
              <ChatInput
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />

              {/* Helper text */}
              <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-4">
                Ask in any language. Get instant answers with exact meeting timestamps and verifiable sources.
              </p>

              {/* Disclaimer */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-3 max-w-2xl mx-auto">
                <strong>Disclaimer:</strong> AI transcriptions may contain errors. Always verify quotes and information against original source recordings before publishing or making decisions.
              </p>

              {/* Empty State Examples */}
              <EmptyState onQuestionClick={handleSubmit} />
            </div>
          </div>
        )}

        {/* Chat Interface - Full height with messages (ChatGPT-style) */}
        {hasMessages && (
          <ChatDialogue
            messages={messages}
            isVisible={hasMessages}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
    </>
  );

  // Conditionally wrap with PageLayout - use custom layout for chat mode
  if (hasMessages) {
    // In chat mode: custom layout without footer, full height
    return (
      <div className="h-[100dvh] md:h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {chatContent}
        </main>
      </div>
    );
  }

  // Landing page mode: standard PageLayout with footer
  return <PageLayout>{chatContent}</PageLayout>;
}

