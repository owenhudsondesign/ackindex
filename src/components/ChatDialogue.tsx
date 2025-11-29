'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message } from '@/lib/types';

interface ChatDialogueProps {
  messages: Message[];
  isVisible: boolean;
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export default function ChatDialogue({ messages, isVisible, onSubmit, isLoading }: ChatDialogueProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isVisible || messages.length === 0) {
    return null;
  }

  return (
    // Full-height container - ChatGPT/Claude style
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      {/* Messages Container - Scrollable area that fills available space */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              citations={message.citations}
              isLoading={message.isLoading}
              verification={message.verification}
              stats={message.stats}
              queryText={message.queryText}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area at Bottom - ChatGPT/Claude style */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <ChatInput
            onSubmit={onSubmit}
            isLoading={isLoading}
            placeholder="Ask a follow-up question..."
          />

          {/* Footer disclaimer */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            All information is sourced from official Nantucket meetings
          </p>
        </div>
      </div>
    </div>
  );
}
