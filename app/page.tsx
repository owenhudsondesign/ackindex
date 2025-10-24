'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFetchEntries } from '@/hooks/useEntries';
import { Category } from '@/types';
import CategoryTabs from '@/components/CategoryTabs';
import SearchBar from '@/components/SearchBar';
import FeedGrid from '@/components/FeedGrid';
import QuestionBox from '@/components/QuestionBox';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { entries, isLoading, isError } = useFetchEntries(
    activeCategory !== 'All' ? activeCategory : undefined
  );

  // Debug logging
  console.log('Home component render:', { entries, isLoading, isError });

  // Filter entries by search query
  const filteredEntries = Array.isArray(entries) ? entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.summary.toLowerCase().includes(query) ||
      entry.source.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query)
    );
  }) : [];

  return (
    <div className="container-custom py-12">
      {/* Hero Section - Simplified */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          Understand Your Town Government
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Ask questions. Get answers. Make sense of Nantucket's civic data.
        </p>
      </motion.div>

      {/* Q&A Feature - Most Prominent */}
      <QuestionBox />

      {/* Divider */}
      <div className="flex items-center gap-4 my-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <span className="text-sm text-gray-500 font-medium">Or browse recent updates</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={setSearchQuery} />

      {/* Category Filters */}
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Results Count */}
      {!isLoading && filteredEntries && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <p className="text-sm text-gray-600">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'update' : 'updates'}{' '}
            {searchQuery && `matching "${searchQuery}"`}
          </p>
        </motion.div>
      )}

      {/* Feed Grid */}
      <FeedGrid
        entries={Array.isArray(filteredEntries) ? filteredEntries : []}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}
