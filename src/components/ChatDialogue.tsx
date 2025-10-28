'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { Message } from '@/lib/types';

interface ChatDialogueProps {
  messages: Message[];
  isVisible: boolean;
}

export default function ChatDialogue({ messages, isVisible }: ChatDialogueProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-ack-blue to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AckIndex Assistant</h3>
                <p className="text-blue-100 text-xs">Searching civic documents</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="px-6 py-6 max-h-[500px] overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
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

        {/* Footer */}
        <div className="bg-ack-light-gray px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-ack-dark-gray text-center">
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
