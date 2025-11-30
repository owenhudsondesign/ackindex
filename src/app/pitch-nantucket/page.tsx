'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function NantucketPitch() {
  useEffect(() => {
    document.title = 'AckIndex - Proposal for Town of Nantucket';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Image
            src="/logo.svg"
            alt="AckIndex"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
          <a
            href="https://ackindex.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ack-blue hover:underline"
          >
            Try the Demo
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Meeting Search for Nantucket
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Make 7 years of town meetings instantly searchable in any language.
          </p>
        </div>

        {/* The Problem */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The Problem</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <ul className="space-y-3 text-gray-700">
              <li>Town meetings contain critical information but are buried in hours of video</li>
              <li>Staff spends time answering "What did the board decide about X?"</li>
              <li>Non-English speakers can't easily access government decisions</li>
              <li>No easy way to search across years of meeting history</li>
            </ul>
          </div>
        </section>

        {/* The Solution */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The Solution</h2>
          <div className="bg-ack-blue/5 border border-ack-blue/20 rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              AckIndex transcribes meetings and makes them searchable with AI. Citizens ask questions in plain language and get answers with exact timestamps and video links.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded p-3 border border-gray-200">
                <span className="font-semibold text-gray-900">100+ Languages</span>
                <p className="text-gray-600">Ask in Spanish, Portuguese, etc.</p>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <span className="font-semibold text-gray-900">Instant Answers</span>
                <p className="text-gray-600">With source citations</p>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <span className="font-semibold text-gray-900">Video Timestamps</span>
                <p className="text-gray-600">Jump to exact moments</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing</h2>

          {/* Annual Service */}
          <div className="bg-white border-2 border-ack-blue rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Annual Service</h3>
                <p className="text-gray-600">Ongoing transcription + AI search for all meetings</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-ack-blue">$33,000</p>
                <p className="text-sm text-gray-500">/year</p>
              </div>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Automatic transcription of all new meetings</li>
              <li>Unlimited AI-powered search for staff and residents</li>
              <li>100+ language support</li>
              <li>Source citations with every answer</li>
            </ul>
          </div>

          {/* Historical Backlog */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">7-Year Historical Archive</h3>
                <p className="text-gray-600">Process 420,000 minutes of backlog (2018-2024)</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">$30,000</p>
                <p className="text-sm text-gray-500">one-time</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Bundled discount when combined with annual service. Can be phased over 12-24 months if preferred.
            </p>
          </div>

          {/* Total */}
          <div className="bg-ack-blue text-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Year 1 Total</h3>
              <p className="text-3xl font-bold">$63,000</p>
            </div>
            <div className="flex justify-between items-center text-white/90 bg-white/10 rounded p-3">
              <span>Year 2+ (ongoing service only)</span>
              <span className="font-semibold">$33,000/year</span>
            </div>
          </div>
        </section>

        {/* ROI / Savings */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Return on Investment</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-bold text-green-900 mb-3">Staff Time Savings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Hours saved per month</span>
                  <span className="font-semibold text-gray-900">40+ hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Staff cost @ $50/hr</span>
                  <span className="font-semibold text-gray-900">$2,000/month</span>
                </div>
                <div className="flex justify-between border-t border-green-200 pt-2">
                  <span className="text-gray-700">Annual savings</span>
                  <span className="font-bold text-green-700">$24,000/year</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-3">Additional Benefits</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>Language accessibility (Select Board priority)</li>
                <li>24/7 self-service for residents</li>
                <li>Searchable institutional memory</li>
                <li>Transparency & civic engagement</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Alternative Options */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Flexible Options</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Start with Current Year Only</h3>
                  <p className="text-sm text-gray-600">No backlog, add historical archives later</p>
                </div>
                <p className="font-bold text-gray-900">$33,000/year</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">3-Year Archive Instead of 7</h3>
                  <p className="text-sm text-gray-600">2022-2024 backlog (~180,000 minutes)</p>
                </div>
                <p className="font-bold text-gray-900">~$15,000 one-time</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Multi-Year Contract</h3>
                  <p className="text-sm text-gray-600">3-year commitment with backlog included</p>
                </div>
                <p className="font-bold text-gray-900">$50,000/year</p>
              </div>
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Included</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">AI transcription of all meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Source citations with every answer</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Unlimited search for all residents</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">100+ language support</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Video links to exact moments</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Priority support</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Downloadable transcripts</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to discuss?</h2>
          <p className="text-gray-600 mb-6">
            Try the live demo at ackindex.com, then let's talk about what works for Nantucket.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://ackindex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-ack-blue text-white rounded-lg font-semibold hover:bg-ack-blue/90 transition-colors"
            >
              Try the Demo
            </a>
            <a
              href="mailto:owen@ackindex.com"
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Contact Owen
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          <p>AckIndex - AI-powered government meeting search</p>
          <p className="mt-1">Built for Nantucket by Owen Hudson</p>
        </div>
      </footer>
    </div>
  );
}
