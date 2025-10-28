'use client';

import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import Image from 'next/image';
import ChatInput from '@/components/ChatInput';
import ChatDialogue from '@/components/ChatDialogue';
import EmptyState from '@/components/EmptyState';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    index: number;
    title: string;
    source: string;
    url?: string;
    similarity: number;
  }>;
  isLoading?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chat API');
      }

      const data = await response.json();

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

      // Replace loading message with error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, but I encountered an error while processing your request. Please try again later or contact support if the problem persists.",
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
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)] py-8">
        <div className="w-full max-w-3xl px-4">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-ack-blue/10 text-ack-blue">
              For transparent government data
            </span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="AckIndex"
              width={200}
              height={53}
              priority
              className="h-12 w-auto"
            />
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            <span className="text-ack-black">Nantucket Civic Data</span>
            <br />
            <span className="text-ack-blue">Made Accessible</span>
          </h1>

          {/* Subheading */}
          <p className="text-center text-ack-dark-gray mb-8 max-w-lg mx-auto">
            Want to know what&apos;s going on in Town? Have a question about zoning permits? AckIndex is here to help.
          </p>

          {/* Chat Input */}
          <ChatInput 
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          {/* Helper text */}
          <p className="text-center text-xs text-ack-dark-gray mt-4">
            AckIndex searches through town meeting minutes, planning board documents, and public records.
          </p>

          {/* Chat Dialogue or Empty State */}
          {hasMessages ? (
            <ChatDialogue messages={messages} isVisible={hasMessages} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </PageLayout>
  );
}

