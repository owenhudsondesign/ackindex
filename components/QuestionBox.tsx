'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Answer {
  text: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
}

export default function QuestionBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleQuestions = [
    "Why did healthcare costs go up 59%?",
    "How much does Nantucket spend per resident?",
    "What's the biggest expense in the town budget?",
    "When will debt payments be paid off?",
    "How does our budget compare to last year?"
  ];

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setAnswer(data);
    } catch (err) {
      setError('Sorry, I couldn\'t answer that question. Try rephrasing or ask something else.');
      console.error('Question error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-2xl p-8 mb-12 border-2 border-ack-blue/20">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Ask About Your Town
        </h2>
        <p className="text-gray-600 text-lg">
          Get instant answers from Nantucket's civic data
        </p>
      </div>

      {/* Question Input */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Why are my taxes going up?"
          disabled={loading}
          className="flex-1 px-6 py-4 rounded-xl border-2 border-ack-blue/30 focus:border-ack-blue focus:outline-none focus:ring-2 focus:ring-ack-blue/20 disabled:opacity-50 text-lg"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-8 py-4 bg-ack-blue text-white font-semibold rounded-xl hover:bg-ack-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Thinking...
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </div>

      {/* Example Questions */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <span className="text-sm text-gray-600 font-medium">Try asking:</span>
        {exampleQuestions.slice(0, 3).map((q, idx) => (
          <button
            key={idx}
            onClick={() => setQuestion(q)}
            disabled={loading}
            className="text-sm px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:border-ack-blue hover:text-ack-blue hover:shadow-sm transition-all disabled:opacity-50"
          >
            "{q}"
          </button>
        ))}
      </div>

      {/* Answer Display */}
      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6 p-6 bg-white rounded-xl border-2 border-ack-blue/30 shadow-md"
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Answer:</h3>
              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {answer.text}
              </div>
            </div>
          </div>

          {answer.sources && answer.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">📄 Sources:</p>
              <div className="flex flex-wrap gap-2">
                {answer.sources.map((source, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 bg-ack-blue/10 text-ack-blue rounded-full border border-ack-blue/20"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {answer.confidence && answer.confidence !== 'high' && (
            <div className="mt-3 text-xs text-gray-500 italic">
              ⚠️ Note: This answer is based on available data. Confidence: {answer.confidence}
            </div>
          )}
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
        >
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
