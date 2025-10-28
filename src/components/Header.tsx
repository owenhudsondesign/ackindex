import Link from 'next/link';
import Image from 'next/image';
import MobileMenu from './MobileMenu';

export default function Header() {
  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.svg" 
              alt="AckIndex Logo" 
              width={150} 
              height={40}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            <Link 
              href="/about"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-ack-dark-gray hover:text-ack-blue transition-colors rounded-md hover:bg-ack-light-gray"
            >
              About
            </Link>
            <Link 
              href="/contact"
              className="px-3 sm:px-5 py-2 text-sm font-medium text-white bg-ack-blue hover:bg-opacity-90 transition-all rounded-full shadow-sm hover:shadow-md"
            >
              Contact
            </Link>
          </nav>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
