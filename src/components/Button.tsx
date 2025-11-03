import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ack-blue dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-ack-blue dark:bg-blue-600 text-white hover:bg-opacity-90 dark:hover:bg-blue-700 shadow-sm hover:shadow-md',
    secondary: 'bg-ack-dark-gray dark:bg-gray-600 text-white hover:bg-opacity-90 dark:hover:bg-gray-700',
    outline: 'border-2 border-ack-blue dark:border-blue-500 text-ack-blue dark:text-blue-400 hover:bg-ack-blue dark:hover:bg-blue-600 hover:text-white',
    ghost: 'text-ack-dark-gray dark:text-gray-300 hover:text-ack-blue dark:hover:text-blue-400 hover:bg-ack-light-gray dark:hover:bg-gray-800',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
