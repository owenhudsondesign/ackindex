'use client';

import { motion } from 'framer-motion';
import { Category } from '@/types';

interface CategoryTabsProps {
  activeCategory: Category | 'All';
  onCategoryChange: (category: Category | 'All') => void;
}

const categories: (Category | 'All')[] = [
  'All',
  'Budget',
  'Real Estate',
  'Town Meeting',
  'Infrastructure',
  'General',
];

export default function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {categories.map((category) => {
        const isActive = category === activeCategory;
        return (
          <motion.button
            key={category}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategoryChange(category)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-ack-blue text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-ack-blue hover:text-ack-blue'
            }`}
          >
            {category}
          </motion.button>
        );
      })}
    </div>
  );
}
