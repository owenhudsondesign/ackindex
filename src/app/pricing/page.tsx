'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Button, Card } from '@/components';
import PageLayout from '@/components/PageLayout';
import { getCurrentUser } from '@/lib/auth';
import { useEffect } from 'react';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleUpgrade = async () => {
    setLoading('premium');

    // Check if user is logged in
    if (!user) {
      router.push('/signup');
      return;
    }

    // Redirect to checkout
    try {
      // Get the session token
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Checkout error response:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout';
      alert(`Error: ${errorMessage}\n\nPlease check the console for more details.`);
      setLoading(null);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Container className="py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Search Nantucket town meetings with AI. Start free, upgrade for unlimited access.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Free Tier */}
          <Card className="relative p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Free</h3>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">$0</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Perfect for casual users</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>15,000 tokens per month</strong>
                  <br />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Approximately 9 questions
                  </span>
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Search all town meetings</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Timestamped quotes</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Weekly email updates</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Community support</span>
              </li>
            </ul>

            <Link href="/signup">
              <Button variant="secondary" fullWidth>
                Get Started Free
              </Button>
            </Link>
          </Card>

          {/* Premium Tier */}
          <Card className="relative border-2 border-blue-500 dark:border-blue-400 shadow-xl p-8">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Premium</h3>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">$9.99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                For professionals & power users
              </p>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>500,000 tokens per month</strong> - Perfect for real estate agents, journalists, lawyers, and researchers who need unlimited access to meeting transcripts.
                </p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>500,000 tokens per month</strong>
                  <br />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Approximately 293 questions
                  </span>
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  Everything in Free, plus...
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Conversation history</strong>
                  <br />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Save and access all your past conversations
                  </span>
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </li>
            </ul>

            <div className="relative">
              <Button
                fullWidth
                disabled={true}
                className="cursor-not-allowed opacity-60"
              >
                Coming Soon
              </Button>
            </div>
          </Card>
        </div>

        {/* Enterprise Notice */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Need More Tokens?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                For organizations or users who need more than 500,000 tokens per month,
                we offer custom enterprise pricing with volume discounts.
              </p>
              <Link href="/contact">
                <Button variant="secondary" size="sm">
                  Contact Us for Enterprise Pricing
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-10 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                What are tokens?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tokens are units of text used by the AI. On average, one question and
                answer uses about 1,700 tokens. Free users get 15,000 tokens (~9 questions),
                while Premium users get 500,000 tokens (~293 questions) per month.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! You can upgrade to Premium anytime. If you downgrade, you'll keep
                Premium features until the end of your billing period, then return to
                the Free tier.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                What happens if I exceed my free tier limit?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                You'll be notified when you're close to your limit. Once you reach
                15,000 tokens, you won't be able to ask more questions until next month,
                unless you upgrade to Premium (500,000 tokens) or contact us for enterprise pricing.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Is there a discount for annual billing?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Not yet, but we're considering annual plans with savings in the future.
                Sign up for email updates to be notified when this becomes available!
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Who is Premium best for?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Premium is ideal for real estate professionals, journalists, researchers,
                lawyers, and anyone who frequently searches Nantucket town meeting transcripts.
                With 500,000 tokens per month, professionals can ask hundreds of questions
                without worrying about limits.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10">
            Create your free account in less than 30 seconds
          </p>
          <Link href="/signup">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
        </Container>
      </div>
    </PageLayout>
  );
}

