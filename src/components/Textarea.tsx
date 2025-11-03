import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-2.5 
            text-gray-900 dark:text-gray-100 
            bg-white dark:bg-gray-700 
            border rounded-lg
            ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
            focus:outline-none focus:ring-2 
            ${error ? 'focus:ring-red-500' : 'focus:ring-ack-blue dark:focus:ring-blue-500'}
            focus:border-transparent
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
            transition-all duration-200
            resize-vertical
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
