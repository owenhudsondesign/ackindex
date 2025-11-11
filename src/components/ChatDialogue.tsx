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
    if (messagesContainerRef.current) {
      // Scroll within the container, not the entire page
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isVisible || messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Messages Container - Expanded, no blue header */}
        <div
          ref={messagesContainerRef}
          className="px-6 py-6 max-h-[70vh] overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 scroll-smooth"
        >
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              citations={message.citations}
              isLoading={message.isLoading}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <ChatInput
            onSubmit={onSubmit}
            isLoading={isLoading}
            placeholder="Ask a follow-up question..."
          />
        </div>

        {/* Footer */}
        <div className="bg-ack-light-gray dark:bg-gray-900 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-ack-dark-gray dark:text-gray-400 text-center">
            <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            All information is sourced from official Nantucket civic documents
          </p>
        </div>
      </div>
    </div>
  );
}
