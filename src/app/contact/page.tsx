'use client';

import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Input from '@/components/Input';
import Textarea from '@/components/Textarea';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { validateContactForm, sanitizeContactForm, ContactFormData } from '@/lib/validation';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize and validate
    const sanitizedData = sanitizeContactForm(formData);
    const validation = validateContactForm(sanitizedData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      setToast({
        show: true,
        message: 'Please fix the errors in the form',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Success!
      setToast({
        show: true,
        message: 'Message sent successfully! We\'ll get back to you soon.',
        type: 'success',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        message: '',
      });

    } catch (error) {
      console.error('Form submission error:', error);
      setToast({
        show: true,
        message: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <Container className="py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-ack-blue/10 dark:bg-ack-blue/20 text-ack-blue dark:text-blue-300 mb-6">
              We'd love to hear from you
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Get In Touch
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Have questions, suggestions, or feedback? Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <Input
                label="Name"
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                error={errors.name}
                disabled={isSubmitting}
                required
              />

              {/* Email Field */}
              <Input
                label="Email"
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                error={errors.email}
                disabled={isSubmitting}
                required
              />

              {/* Message Field */}
              <Textarea
                label="Message"
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                placeholder="Tell us what's on your mind..."
                error={errors.message}
                helperText={`${formData.message.length}/1000 characters`}
                disabled={isSubmitting}
                required
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </Button>
            </form>

            {/* Info Text */}
            <div className="mt-8 flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 text-ack-blue dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p>
                We typically respond within 24-48 hours. For urgent matters regarding Nantucket civic data, 
                please contact the relevant town department directly.
              </p>
            </div>
          </div>

          {/* Alternative Contact Info */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-ack-blue/5 to-ack-blue/10 dark:from-ack-blue/10 dark:to-ack-blue/20 rounded-lg p-6 border border-ack-blue/20 dark:border-ack-blue/30">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-ack-blue dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">About the Project</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                AckIndex is an independent civic technology project. We're not affiliated with the Town of Nantucket government.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/40 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Data Sources</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Have a suggestion for additional civic data sources we should index? Let us know in your message!
              </p>
            </div>
          </div>
        </div>
      </Container>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </PageLayout>
  );
}


