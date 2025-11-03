'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Conversation {
  id: string;
  title: string;
  last_message_at: string;
  message_count: number;
}

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isPremium: boolean;
  refreshTrigger?: number; // Add trigger to force refresh
}

export default function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isPremium,
  refreshTrigger = 0,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isPremium) {
      fetchConversations();
    }
  }, [isPremium, refreshTrigger]); // Refresh when trigger changes

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));

        // If deleted current conversation, start new one
        if (conversationId === currentConversationId) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // For non-premium users, show sidebar with upgrade overlay
  const sidebarContent = (
    <div className="flex flex-col h-full p-4">
      {/* New Chat Button */}
      <button
        onClick={() => {
          onNewConversation();
          setIsOpen(false);
          if (isPremium) fetchConversations();
        }}
        className="w-full mb-6 px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        disabled={!isPremium}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>

      {/* Conversations List */}
      <div className="flex-grow overflow-y-auto -mx-2 px-2">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
          Recent
        </h3>

        {isLoading && isPremium ? (
          <div className="text-center py-8">
            <div className="inline-block w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Start chatting to create one</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  if (isPremium) {
                    onSelectConversation(conversation.id);
                    setIsOpen(false);
                  }
                }}
                className={`
                  group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${currentConversationId === conversation.id && isPremium
                    ? 'bg-gray-100 dark:bg-gray-800/50'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                  }
                  ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                      {conversation.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {conversation.message_count} msgs
                      </p>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(conversation.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {isPremium && (
                    <button
                      onClick={(e) => handleDelete(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Badge or Upgrade CTA */}
      <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
        {isPremium ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
            <span className="text-base">✨</span>
            <div className="flex-grow">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Premium
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400/70">
                History enabled
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Upgrade for chat history
            </p>
            <Link
              href="/pricing"
              className="block w-full px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-all shadow-sm border border-gray-200"
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2.5 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40
        w-64 h-screen bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-800/50
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {sidebarContent}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
        />
      )}
    </>
  );
}
