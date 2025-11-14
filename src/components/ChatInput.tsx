'use client';

import { useState, FormEvent } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSubmit, 
  isLoading = false,
  placeholder = "e.g. What are the latest Town Meeting articles about?"
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full shadow-lg shadow-ack-blue/20 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-ack-blue/30 dark:hover:shadow-blue-900/40 focus-within:shadow-xl focus-within:shadow-ack-blue/40 dark:focus-within:shadow-blue-900/50 focus-within:border-ack-blue dark:focus-within:border-blue-500 transition-all">
        {/* Search Icon */}
        <div className="pl-5 pr-3">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-200"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-grow py-4 px-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base disabled:opacity-50"
          aria-label="Ask a question"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="mr-2 p-3 bg-ack-blue hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Submit query"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
