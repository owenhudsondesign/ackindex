import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Image
              src="/logo.svg"
              alt="AckIndex Logo"
              width={140}
              height={35}
            />
            <p className="text-sm text-ack-dark-gray dark:text-gray-400 max-w-xs">
              Making Nantucket's civic data accessible and understandable through AI-powered analysis.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-ack-black dark:text-gray-100 mb-3">Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-ack-dark-gray dark:text-gray-400 hover:text-ack-blue dark:hover:text-blue-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-ack-dark-gray dark:text-gray-400 hover:text-ack-blue dark:hover:text-blue-400 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-ack-dark-gray dark:text-gray-400 hover:text-ack-blue dark:hover:text-blue-400 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* About This Project */}
          <div>
            <h3 className="text-sm font-semibold text-ack-black dark:text-gray-100 mb-3">About This Project</h3>
            <p className="text-sm text-ack-dark-gray dark:text-gray-400">
              An independent civic technology project for transparent, accessible government data.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-ack-dark-gray dark:text-gray-400 text-center">
            © {new Date().getFullYear()} AckIndex. Built for civic transparency.
          </p>
        </div>
      </div>
    </footer>
  );
}
