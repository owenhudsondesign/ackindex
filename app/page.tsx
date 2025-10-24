'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFetchEntries } from '@/hooks/useEntries';
import { Category } from '@/types';
import CategoryTabs from '@/components/CategoryTabs';
import SearchBar from '@/components/SearchBar';
import FeedGrid from '@/components/FeedGrid';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { entries, isLoading, isError } = useFetchEntries(
    activeCategory !== 'All' ? activeCategory : undefined
  );

  // Debug logging
  console.log('Home component render:', { entries, isLoading, isError });

  // Filter entries by search query
  const filteredEntries = entries?.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.summary.toLowerCase().includes(query) ||
      entry.source.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container-custom py-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Nantucket&apos;s Window Into Itself
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Stay informed with clear, data-driven summaries of town budgets, real estate updates,
          infrastructure projects, and civic decisions.
        </p>
      </motion.div>

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
        entries={filteredEntries || []} 
        isLoading={isLoading} 
        isError={isError}
      />
    </div>
  );
}
