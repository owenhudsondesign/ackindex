'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MobileMenu from './MobileMenu';
import { getCurrentUser } from '@/lib/auth';

export default function Header() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            {/* Light mode logo */}
            <Image
              src="/logo.svg"
              alt="AckIndex Logo"
              width={150}
              height={40}
              priority
              className="block dark:hidden"
            />
            {/* Dark mode logo */}
            <Image
              src="/logo-white.svg"
              alt="AckIndex Logo"
              width={150}
              height={40}
              priority
              className="hidden dark:block"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            <Link
              href="/blog"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-ack-blue dark:hover:text-blue-300 transition-colors rounded-md hover:bg-ack-light-gray dark:hover:bg-gray-800"
            >
              Blog
            </Link>
            <Link
              href="/about"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-ack-blue dark:hover:text-blue-300 transition-colors rounded-md hover:bg-ack-light-gray dark:hover:bg-gray-800"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-ack-blue dark:hover:text-blue-300 transition-colors rounded-md hover:bg-ack-light-gray dark:hover:bg-gray-800"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-ack-blue dark:hover:text-blue-300 transition-colors rounded-md hover:bg-ack-light-gray dark:hover:bg-gray-800"
            >
              Contact
            </Link>

            {!loading && (
              <>
                {user ? (
                  <Link
                    href="/account"
                    className="px-3 sm:px-5 py-2 text-sm font-medium text-white bg-ack-blue hover:bg-opacity-90 dark:hover:bg-blue-600 transition-all rounded-full shadow-sm hover:shadow-md"
                  >
                    My Account
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-ack-blue dark:hover:text-blue-300 transition-colors rounded-md hover:bg-ack-light-gray dark:hover:bg-gray-800"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-3 sm:px-5 py-2 text-sm font-medium text-white bg-ack-blue hover:bg-opacity-90 dark:hover:bg-blue-600 transition-all rounded-full shadow-sm hover:shadow-md"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
