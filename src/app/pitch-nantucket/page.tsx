'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function NantucketPitch() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Set page title
  useEffect(() => {
    document.title = 'AckIndex - Partnership Proposal for Town of Nantucket';
  }, []);

  const slides = [
    { id: 0, title: 'Cover' },
    { id: 1, title: 'Problem' },
    { id: 2, title: 'Solution' },
    { id: 3, title: 'How It Works' },
    { id: 4, title: 'Benefits' },
    { id: 5, title: 'Use Cases' },
    { id: 6, title: 'Technology' },
    { id: 7, title: 'Next Steps' }
  ];

  // Scroll to slide
  const scrollToSlide = (slideId: number) => {
    const element = document.getElementById(`slide-${slideId}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track active slide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const slideElements = slides.map(s => document.getElementById(`slide-${s.id}`));
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      slideElements.forEach((element, index) => {
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSlide(index);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Dots */}
      <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col gap-3">
          {slides.map((slide) => (
            <button
              key={slide.id}
              onClick={() => scrollToSlide(slide.id)}
              className="group relative"
              aria-label={`Go to ${slide.title}`}
            >
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeSlide === slide.id
                    ? 'bg-blue-600 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {slide.title}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Slide 1: Cover */}
      <section
        id="slide-0"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.svg"
              alt="AckIndex"
              width={240}
              height={63}
              priority
              className="h-16 w-auto"
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Making Civic Information
            <span className="block text-blue-600 mt-2">Instantly Accessible</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12">
            A Partnership Proposal for the Town of Nantucket
          </p>

          <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* Slide 2: Problem */}
      <section
        id="slide-1"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-white"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            The Challenge
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl border border-red-200">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Difficult to Navigate</h3>
              <p className="text-gray-700">
                Citizens struggle to find specific information across hundreds of pages of meeting minutes, bylaws, and regulations on government websites.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl border border-orange-200">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Time-Consuming</h3>
              <p className="text-gray-700">
                Staff spend hours answering repetitive questions about permits, zoning, regulations, and public records via phone and email.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-2xl border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Barriers to Engagement</h3>
              <p className="text-gray-700">
                Complex navigation and dense documents discourage civic participation, particularly for new residents and working families.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl border border-purple-200">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Information Silos</h3>
              <p className="text-gray-700">
                Data is scattered across PDFs, web pages, and different department websites, making comprehensive answers difficult.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 3: Solution */}
      <section
        id="slide-2"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            The AckIndex Solution
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
            AI-Powered Civic Information
            <span className="block text-blue-600 mt-2">At Your Fingertips</span>
          </h2>

          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            AckIndex transforms how citizens interact with government information using advanced AI to provide instant, accurate answers with source citations.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
            <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-200">
              <div className="text-center">
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
                  <div className="flex items-start gap-3 text-left mb-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-700">
                        What are the zoning requirements for residential construction in Nantucket?
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                        Residential construction in Nantucket requires compliance with...
                        <div className="mt-2 text-xs text-blue-600">
                          📄 Source: Nantucket Zoning Bylaws, Section 139-8
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-600">Citizens ask questions in plain English and receive accurate, cited responses instantly.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold text-gray-900 mb-2">Instant Answers</h3>
              <p className="text-sm text-gray-600">Get information in seconds, not hours</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-3xl mb-3">📚</div>
              <h3 className="font-bold text-gray-900 mb-2">Always Cited</h3>
              <p className="text-sm text-gray-600">Every answer includes source documents</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-bold text-gray-900 mb-2">Always Current</h3>
              <p className="text-sm text-gray-600">Regular updates keep data fresh</p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 4: How It Works */}
      <section
        id="slide-3"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-white"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>

          <div className="relative">
            {/* Vertical line connecting steps */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-blue-200 hidden md:block"></div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  1
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Data Collection</h3>
                  <p className="text-gray-700">
                    We securely scrape and index all public information from town websites, meeting minutes, bylaws, regulations, and public records.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  2
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI Processing</h3>
                  <p className="text-gray-700">
                    Advanced AI (GPT-4) creates semantic embeddings, enabling the system to understand context and intent, not just keywords.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  3
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Citizen Query</h3>
                  <p className="text-gray-700">
                    Citizens ask questions in natural language—no need to know specific terminology or where information lives.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  4
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Intelligent Response</h3>
                  <p className="text-gray-700">
                    The system finds relevant information, synthesizes it into a clear answer, and provides links to source documents for verification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <p className="text-center text-gray-700">
              <span className="font-semibold text-gray-900">Built on proven technology:</span> Retrieval-Augmented Generation (RAG) ensures accuracy by grounding AI responses in actual town documents.
            </p>
          </div>
        </div>
      </section>

      {/* Slide 5: Benefits */}
      <section
        id="slide-4"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            Benefits for the Town
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-green-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Reduce Staff Burden</h3>
                  <p className="text-gray-600">
                    Decrease time spent answering repetitive questions, allowing staff to focus on complex cases and high-value work.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Improve Civic Engagement</h3>
                  <p className="text-gray-600">
                    Make government information accessible to all residents, encouraging informed participation in civic matters.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-purple-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">24/7 Availability</h3>
                  <p className="text-gray-600">
                    Citizens get answers any time of day or night, not just during office hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-orange-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Data-Driven Insights</h3>
                  <p className="text-gray-600">
                    Track common questions to identify where information architecture or communication can be improved.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Cost-Effective</h3>
                  <p className="text-gray-600">
                    Lower operational costs compared to expanding staff hours or implementing traditional call center solutions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-indigo-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Consistency & Accuracy</h3>
                  <p className="text-gray-600">
                    Every answer is grounded in official documents, ensuring consistent information across all citizen interactions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 6: Use Cases */}
      <section
        id="slide-5"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-white"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            Real-World Use Cases
          </h2>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-8 border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🏗️</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Building & Development</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="font-semibold">Question:</span> "What permits do I need to build a deck on my property?"
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Value:</span> Reduces call volume to Building Department; homeowners get immediate guidance on required permits, forms, and process steps.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-8 border border-green-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🏘️</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Zoning & Planning</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="font-semibold">Question:</span> "What are the setback requirements for my lot on Main Street?"
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Value:</span> Residents and developers quickly understand zoning rules before starting projects, reducing planning review times.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-8 border border-purple-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📋</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Town Meetings & Decisions</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="font-semibold">Question:</span> "What did the Select Board decide about parking regulations last month?"
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Value:</span> Citizens stay informed about town decisions without reading entire meeting transcripts; improves civic awareness.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-8 border border-orange-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🚗</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Services & Regulations</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="font-semibold">Question:</span> "When is beach parking free for residents?"
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Value:</span> Reduces repetitive questions to front desk staff about schedules, fees, and seasonal regulations.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-8 border border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🏢</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Business & Licensing</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="font-semibold">Question:</span> "How do I apply for a food service license?"
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-semibold">Value:</span> Business owners find application requirements and deadlines instantly, speeding up licensing process.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 italic">
              These represent just a fraction of the daily inquiries that AckIndex can handle automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Slide 7: Technology */}
      <section
        id="slide-6"
        className="min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            Built on Proven Technology
          </h2>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Core Technologies</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">OpenAI GPT-4</span>
                      <p className="text-sm text-gray-600">Industry-leading AI for natural language understanding</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">PostgreSQL + pgvector</span>
                      <p className="text-sm text-gray-600">Enterprise-grade database with semantic search</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">Next.js 14</span>
                      <p className="text-sm text-gray-600">Modern web framework for performance and reliability</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Security & Reliability</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">Row Level Security</span>
                      <p className="text-sm text-gray-600">Data isolation and access control</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">HTTPS/TLS Encryption</span>
                      <p className="text-sm text-gray-600">All data transmitted securely</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <span className="font-semibold">Regular Backups</span>
                      <p className="text-sm text-gray-600">Automated backup and disaster recovery</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What Makes RAG Different</h3>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <p className="text-gray-700 mb-3">
                  Unlike generic AI chatbots that can "hallucinate" or make up information, AckIndex uses <span className="font-semibold">Retrieval-Augmented Generation (RAG)</span>.
                </p>
                <p className="text-gray-700">
                  This means every answer is grounded in actual town documents. The AI can only reference information that exists in your official records, ensuring accuracy and accountability.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700 mb-1">99.9%</div>
              <div className="text-sm text-gray-600">Uptime Target</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700 mb-1">&lt; 2s</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-700 mb-1">100%</div>
              <div className="text-sm text-gray-600">Source Citations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 8: Next Steps */}
      <section
        id="slide-7"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
            Let's Work Together
          </h2>

          <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto">
            AckIndex is ready to serve the Town of Nantucket. Let's discuss how we can customize the platform to meet your specific needs.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Proposed Partnership Model</h3>

            <div className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Discovery Phase:</span> Meet with department heads to understand information needs and common citizen inquiries
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Data Integration:</span> Index all public town documents, websites, and records (typically 2-4 weeks)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Pilot Program:</span> Limited launch with town staff for testing and refinement (1 month)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Public Launch:</span> Roll out to all Nantucket residents with training for staff
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  5
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Ongoing Support:</span> Regular updates, monitoring, and optimization based on usage patterns
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-2 text-gray-700">
              <p className="text-lg">
                <span className="font-semibold">Owen Hudson</span>
              </p>
              <p>Founder, AckIndex</p>
              <p className="text-blue-600">
                <a href="mailto:owenhudsondesign@gmail.com" className="hover:underline">
                  owenhudsondesign@gmail.com
                </a>
              </p>
              <p className="text-blue-600">
                <a href="https://ackindex.com" className="hover:underline" target="_blank" rel="noopener noreferrer">
                  ackindex.com
                </a>
              </p>
            </div>
          </div>

          <div className="text-gray-600">
            <p className="text-sm">
              Thank you for considering AckIndex as a partner in making Nantucket's civic information more accessible to all residents.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
