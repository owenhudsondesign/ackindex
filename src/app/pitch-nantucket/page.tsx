'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function NantucketPitch() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Set page title
  useEffect(() => {
    document.title = 'AckIndex - Meeting Transcription AI for Town of Nantucket';
  }, []);

  const slides = [
    { id: 0, title: 'Cover' },
    { id: 1, title: 'The Challenge' },
    { id: 2, title: 'Solution' },
    { id: 3, title: 'What Town Gets' },
    { id: 4, title: 'How It Works' },
    { id: 5, title: 'Pricing Model' },
    { id: 6, title: 'Pricing & ROI' },
    { id: 7, title: 'Cost Comparison' },
    { id: 8, title: 'Security & Compliance' },
    { id: 9, title: 'Historical Archive' },
    { id: 10, title: 'Pilot Program' }
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
    <div className="min-h-screen bg-ack-white relative">
      {/* Subtle Grid Background - Light Mode */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(200 200 200 / 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(200 200 200 / 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)
          `,
          backgroundSize: '40px 40px, 40px 40px, 100% 100%',
          backgroundPosition: '0 0, 0 0, center',
          zIndex: 0
        }}
      />

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
                    ? 'bg-ack-blue scale-125'
                    : 'bg-ack-light-gray hover:bg-ack-dark-gray'
                }`}
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-ack-dark-gray text-white px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {slide.title}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Slide 1: Cover */}
      <section
        id="slide-0"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-ack-white to-ack-light-gray"
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

          <h1 className="text-5xl md:text-6xl font-bold text-ack-black mb-6">
            Official Meeting Transcription Services
            <span className="block text-ack-blue mt-2">for Town of Nantucket</span>
          </h1>

          <p className="text-xl md:text-2xl text-ack-dark-gray mb-12">
            Professional AI Transcription + Citizen Transparency Platform
          </p>

          <div className="inline-flex items-center gap-2 text-ack-dark-gray text-sm">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* Slide 2: The Challenge */}
      <section
        id="slide-1"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            The Challenge
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-ack-white p-8 rounded-2xl border-2 border-ack-blue/20">
              <div className="w-12 h-12 bg-ack-blue rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ack-black mb-3">Buried Information</h3>
              <p className="text-ack-dark-gray">
                Meeting transcripts are hundreds of pages long. Finding specific discussions about permits, zoning, or town decisions requires reading through entire documents.
              </p>
            </div>

            <div className="bg-ack-white p-8 rounded-2xl border-2 border-ack-blue/20">
              <div className="w-12 h-12 bg-ack-blue rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ack-black mb-3">Staff Time Drain</h3>
              <p className="text-ack-dark-gray">
                Town staff spend hours answering "What was decided about X?" questions, searching through old meeting minutes manually.
              </p>
            </div>

            <div className="bg-ack-white p-8 rounded-2xl border-2 border-ack-blue/20">
              <div className="w-12 h-12 bg-ack-blue rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ack-black mb-3">Limited Transparency</h3>
              <p className="text-ack-dark-gray">
                Citizens want to know what their government is doing, but dense PDF transcripts discourage engagement and civic participation.
              </p>
            </div>

            <div className="bg-ack-white p-8 rounded-2xl border-2 border-ack-blue/20">
              <div className="w-12 h-12 bg-ack-blue rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ack-black mb-3">Language Barriers</h3>
              <p className="text-ack-dark-gray">
                Non-English speaking residents struggle to access meeting information, limiting participation from the full community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 3: Solution */}
      <section
        id="slide-2"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-ack-blue/10 text-ack-blue px-4 py-2 rounded-full text-sm font-semibold mb-6">
            The AckIndex Solution
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8">
            Ask Questions About
            <span className="block text-ack-blue mt-2">Any Town Meeting</span>
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 max-w-3xl mx-auto">
            AckIndex automatically transcribes Select Board meetings and makes them searchable with AI. Citizens get instant answers with exact timestamps and source citations.
          </p>

          <div className="bg-ack-light-gray rounded-2xl p-8 md:p-12 mb-8 border border-ack-blue/20">
            <div className="aspect-video bg-ack-white rounded-xl flex items-center justify-center mb-6 border-2 border-ack-blue/20">
              <div className="text-center max-w-2xl mx-auto p-6">
                <div className="bg-ack-light-gray rounded-xl shadow-lg p-6">
                  <div className="flex items-start gap-3 text-left mb-4">
                    <div className="w-8 h-8 bg-ack-dark-gray rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="bg-ack-white rounded-lg p-3 text-sm text-ack-black border border-ack-blue/20">
                        What did the Select Board decide about short-term rental regulations?
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 bg-ack-blue rounded-full flex-shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="bg-ack-blue/10 border border-ack-blue/30 rounded-lg p-3 text-sm text-ack-black">
                        The Select Board voted 4-1 to approve new short-term rental regulations requiring registration and limiting rentals to 90 days per year...
                        <div className="mt-2 text-xs text-ack-blue font-medium">
                          📄 Source: Select Board Meeting, March 15, 2024 [12:34]
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-ack-dark-gray">Ask questions in plain English, get answers with exact meeting timestamps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-ack-light-gray p-6 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold text-ack-black mb-2">Instant Search</h3>
              <p className="text-sm text-ack-dark-gray">Find any discussion in seconds</p>
            </div>
            <div className="bg-ack-light-gray p-6 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-bold text-ack-black mb-2">Timestamped</h3>
              <p className="text-sm text-ack-dark-gray">Jump to exact moment in recording</p>
            </div>
            <div className="bg-ack-light-gray p-6 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-bold text-ack-black mb-2">Auto-Updated</h3>
              <p className="text-sm text-ack-dark-gray">New meetings indexed automatically</p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 4: What the Town Contract Includes */}
      <section
        id="slide-3"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            What's Included in Your Town Contract
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Primary: Transcription Services */}
            <div className="bg-ack-blue/10 rounded-2xl p-8 border-2 border-ack-blue/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-ack-blue rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-ack-black">1. Official Transcription Services</h3>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Professional-grade transcription</strong> of all Select Board meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Speaker identification</strong> and precise timestamps</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>24-48 hour turnaround</strong> on new meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Downloadable transcript files</strong> for town archives</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Accuracy guarantees</strong> and correction process</span>
                </li>
              </ul>
            </div>

            {/* Secondary: Enterprise Features */}
            <div className="bg-ack-light-gray rounded-2xl p-8 border-2 border-ack-blue/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-ack-blue/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-ack-black">2. Enterprise Tools for Staff</h3>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Unlimited searches</strong> for all town employees</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Admin dashboard</strong> with meeting analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Priority processing</strong> of new meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Direct upload</strong> of audio/video files</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Dedicated support line</strong> for urgent requests</span>
                </li>
              </ul>
            </div>

            {/* Tertiary: Citizen Benefits */}
            <div className="bg-ack-light-gray rounded-2xl p-8 border-2 border-ack-blue/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-ack-blue/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-ack-black">3. Town-Sponsored Citizen Access</h3>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>All Nantucket residents</strong> get unlimited premium access</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>No paywalls</strong> between citizens and their government</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Branded as "Sponsored by Town of Nantucket"</strong> in app</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>24/7 self-service</strong> reduces staff workload</span>
                </li>
              </ul>
            </div>

            {/* Quaternary: Meeting Management */}
            <div className="bg-ack-light-gray rounded-2xl p-8 border-2 border-ack-blue/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-ack-blue/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-ack-black">4. Meeting Management</h3>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Automatic detection</strong> and indexing of new meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Integration</strong> with town's existing video platform</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Archival and backup</strong> services</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Historical backfill options</strong> (3-year or 7-year packages)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-ack-blue text-white rounded-2xl p-8 text-center">
            <p className="text-xl mb-2">
              <strong>Bottom Line:</strong> You're replacing your transcription service, not buying search access.
            </p>
            <p className="text-lg opacity-90">
              The AI-powered citizen platform is a value-added benefit that makes Nantucket a leader in civic tech.
            </p>
          </div>
        </div>
      </section>

      {/* Slide 5: Meeting Transcription */}
      <section
        id="slide-4"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Automated Transcription Pipeline
          </h2>

          <div className="relative">
            {/* Vertical line connecting steps */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-ack-blue/30 hidden md:block"></div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-ack-blue rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  1
                </div>
                <div className="flex-1 bg-ack-white rounded-xl p-6 border-2 border-ack-blue/20">
                  <h3 className="text-xl font-bold text-ack-black mb-2">Meeting Recording</h3>
                  <p className="text-ack-dark-gray">
                    AckIndex connects to your existing meeting video platform (YouTube, Vimeo, local recordings) and automatically detects new Select Board meetings.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-ack-blue rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  2
                </div>
                <div className="flex-1 bg-ack-white rounded-xl p-6 border-2 border-ack-blue/20">
                  <h3 className="text-xl font-bold text-ack-black mb-2">AI Transcription</h3>
                  <p className="text-ack-dark-gray">
                    State-of-the-art speech-to-text AI transcribes the entire meeting with speaker identification and precise timestamps.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-ack-blue rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  3
                </div>
                <div className="flex-1 bg-ack-white rounded-xl p-6 border-2 border-ack-blue/20">
                  <h3 className="text-xl font-bold text-ack-black mb-2">Semantic Indexing</h3>
                  <p className="text-ack-dark-gray">
                    GPT-4 creates semantic embeddings of every discussion, enabling intelligent search that understands context and intent, not just keywords.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-ack-blue rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 z-10">
                  4
                </div>
                <div className="flex-1 bg-ack-white rounded-xl p-6 border-2 border-ack-blue/20">
                  <h3 className="text-xl font-bold text-ack-black mb-2">Instant Access</h3>
                  <p className="text-ack-dark-gray">
                    Citizens search meetings in natural language and get answers with exact quotes, timestamps, and links to the video recording.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-ack-blue/10 rounded-xl p-6 border border-ack-blue/30">
            <p className="text-center text-ack-dark-gray">
              <span className="font-semibold text-ack-black">Already working:</span> AckIndex is currently indexing all Nantucket public government meetings from YouTube at ackindex.com
            </p>
          </div>
        </div>
      </section>

      {/* Slide 6: How AckIndex Pricing Works */}
      <section
        id="slide-5"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            How AckIndex Pricing Works
          </h2>

          {/* For Residents Today */}
          <div className="bg-ack-light-gray rounded-2xl p-8 mb-8 border-2 border-ack-blue/20">
            <h3 className="text-2xl font-bold text-ack-black mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              For Nantucket Residents Today
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">Free tier:</span> 50,000 tokens/month (~35-50 searches)
                </p>
              </div>
              <div>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">Premium:</span> $9.99/month for unlimited searches
                </p>
              </div>
            </div>
          </div>

          {/* With Town Partnership */}
          <div className="bg-ack-blue/10 rounded-2xl p-8 mb-8 border-2 border-ack-blue/50">
            <h3 className="text-2xl font-bold text-ack-black mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-ack-blue rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              With a Town Partnership
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-ack-white rounded-xl p-6 border border-ack-blue/30">
                <p className="text-sm text-ack-dark-gray mb-2">Town pays:</p>
                <p className="text-2xl font-bold text-ack-blue mb-3">$3,500/month</p>
                <p className="text-sm text-ack-dark-gray">Professional transcription services + infrastructure</p>
              </div>
              <div className="bg-ack-white rounded-xl p-6 border border-ack-blue/30">
                <p className="text-sm text-ack-dark-gray mb-2">Residents get:</p>
                <p className="text-2xl font-bold text-green-600 mb-3">Unlimited FREE</p>
                <p className="text-sm text-ack-dark-gray">Premium access at no cost (town-sponsored)</p>
              </div>
              <div className="bg-ack-white rounded-xl p-6 border border-ack-blue/30">
                <p className="text-sm text-ack-dark-gray mb-2">Town receives:</p>
                <p className="text-lg font-bold text-ack-black mb-1">Official Transcripts</p>
                <p className="text-sm text-ack-dark-gray">Staff dashboard, analytics, priority support</p>
              </div>
            </div>
          </div>

          {/* What Town Gets */}
          <div className="bg-ack-white rounded-2xl p-8 border-2 border-ack-blue/20">
            <h3 className="text-2xl font-bold text-ack-black mb-6 text-center">What the Town Contract Includes</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Professional meeting transcription service</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Eliminates need to hire transcription services</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Official archival-quality records</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Staff time savings from citizen self-service</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Enhanced transparency without extra work</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">All residents get premium access (town-sponsored benefit)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 7: Transparent Pricing & ROI */}
      <section
        id="slide-6"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Transparent Pricing & ROI
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Pricing Card */}
            <div className="bg-ack-light-gray rounded-2xl p-8 border-2 border-ack-blue/30">
              <h3 className="text-2xl font-bold text-ack-black mb-6">Monthly Service</h3>
              <div className="text-5xl font-bold text-ack-blue mb-6">$3,500<span className="text-2xl text-ack-dark-gray">/mo</span></div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-ack-dark-gray">Automatic transcription of all Select Board meetings</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-ack-dark-gray">Unlimited AI search queries for staff & citizens</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-ack-dark-gray">Monthly usage reports & analytics</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-ack-dark-gray">Email support & transcription corrections</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-ack-dark-gray">Same-day transcription availability</p>
                </div>
              </div>

              <p className="text-sm text-ack-dark-gray italic">Cancel anytime. No long-term contracts.</p>
            </div>

            {/* ROI Card */}
            <div className="bg-ack-blue/10 rounded-2xl p-8 border-2 border-ack-blue/30">
              <h3 className="text-2xl font-bold text-ack-black mb-6">Return on Investment</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-ack-black mb-2">Traditional Transcription Replacement</h4>
                  <p className="text-ack-dark-gray text-sm mb-2">5 Select Board meetings/month at 2 hours each = 10 hours</p>
                  <p className="text-ack-dark-gray text-sm mb-2">
                    Traditional transcription: <span className="font-semibold text-ack-black">10 hrs × $125/hr = $1,250/month</span>
                  </p>
                  <p className="text-ack-dark-gray text-sm">
                    Annual cost: <span className="font-semibold text-ack-black">$15,000/year</span>
                  </p>
                </div>

                <div className="border-t border-ack-blue/20 pt-6">
                  <h4 className="font-bold text-ack-black mb-2">Staff Time Savings</h4>
                  <p className="text-ack-dark-gray text-sm mb-2">Staff search time saved: <span className="font-semibold text-ack-black">15 hrs/month × $35/hr = $525/month</span></p>
                  <p className="text-ack-dark-gray text-sm">
                    Annual savings: <span className="font-semibold text-ack-black">$6,300/year</span>
                  </p>
                </div>

                <div className="border-t border-ack-blue/20 pt-6 bg-ack-white rounded-lg p-4">
                  <h4 className="font-bold text-ack-blue mb-2">Total Annual Value</h4>
                  <p className="text-2xl font-bold text-ack-black mb-2">$21,300/year</p>
                  <p className="text-sm text-ack-dark-gray">For a service that costs <span className="font-semibold text-ack-black">$42,000/year</span></p>
                  <p className="text-sm text-ack-dark-gray mt-2 italic">This excludes transparency & engagement value</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ack-white rounded-xl p-6 border border-ack-blue/20 text-center">
            <p className="text-ack-dark-gray">
              <span className="font-semibold text-ack-black">Bottom line:</span> You're already spending money on transcription and staff time searching records. We'll do both for less, and as a bonus, your residents get an AI-powered transparency tool.
            </p>
          </div>
        </div>
      </section>

      {/* Slide 7: Cost Comparison */}
      <section
        id="slide-7"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Competitive Positioning
          </h2>

          <div className="bg-ack-white rounded-2xl overflow-hidden border-2 border-ack-blue/20 mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-ack-blue text-white">
                  <th className="text-left p-6 font-bold">Service</th>
                  <th className="text-left p-6 font-bold">Cost</th>
                  <th className="text-left p-6 font-bold">What You Get</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-ack-light-gray">
                  <td className="p-6 font-semibold text-ack-black">Traditional Transcription</td>
                  <td className="p-6 text-ack-dark-gray">$100-150/hour<br/><span className="text-sm">(~$15,000/year)</span></td>
                  <td className="p-6 text-ack-dark-gray">Text transcripts only, no search</td>
                </tr>
                <tr className="border-b border-ack-light-gray">
                  <td className="p-6 font-semibold text-ack-black">Manual Staff Time</td>
                  <td className="p-6 text-ack-dark-gray">$35/hr × 10-15 hrs/month<br/><span className="text-sm">(~$6,300/year)</span></td>
                  <td className="p-6 text-ack-dark-gray">Inconsistent, diverts from core duties</td>
                </tr>
                <tr className="bg-ack-blue/5">
                  <td className="p-6 font-semibold text-ack-blue">AckIndex</td>
                  <td className="p-6 font-bold text-ack-blue">$3,500/month flat rate<br/><span className="text-sm text-ack-dark-gray">($42,000/year)</span></td>
                  <td className="p-6 font-bold text-ack-black">Transcription + AI search + unlimited resident access + staff tools + analytics</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-ack-light-gray rounded-xl p-8 border border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4">Example ROI Calculation</h3>
              <div className="space-y-3 text-ack-dark-gray">
                <p>
                  <strong className="text-ack-black">Traditional transcription:</strong><br/>
                  10 hrs/month × $125/hr = $1,250/month
                </p>
                <p>
                  <strong className="text-ack-black">Staff search time saved:</strong><br/>
                  15 hrs/month × $35/hr = $525/month
                </p>
                <p className="pt-3 border-t border-ack-blue/20">
                  <strong className="text-ack-blue">Total monthly value:</strong> $1,775<br/>
                  <span className="text-sm">(excluding transparency/engagement value)</span>
                </p>
                <p className="text-lg font-bold text-ack-black">
                  Annual value: $21,300 for a $42,000/year service
                </p>
              </div>
            </div>

            <div className="bg-ack-blue/10 rounded-xl p-8 border border-ack-blue/30">
              <h3 className="text-xl font-bold text-ack-black mb-4">What Makes AckIndex Different</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray"><strong className="text-ack-black">Unlimited meetings:</strong> No per-meeting charges</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray"><strong className="text-ack-black">Same-day delivery:</strong> vs. 3-5 day traditional turnaround</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray"><strong className="text-ack-black">AI-powered search:</strong> Not just text, but semantic understanding</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray"><strong className="text-ack-black">Citizen transparency:</strong> Political win + staff time savings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 8: Security & Compliance */}
      <section
        id="slide-8"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Security & Compliance
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-ack-light-gray rounded-xl p-8 border border-ack-blue/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-ack-black">Massachusetts Public Records Law</h3>
              </div>
              <p className="text-ack-dark-gray">
                All transcriptions are public records compliant. Source videos remain authoritative. AckIndex provides supplemental search access, not official records.
              </p>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-8 border border-ack-blue/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-ack-black">Data Security</h3>
              </div>
              <ul className="space-y-2 text-ack-dark-gray">
                <li className="flex items-start gap-2">
                  <span className="text-ack-blue mt-1">•</span>
                  <span>All data encrypted in transit (HTTPS/TLS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ack-blue mt-1">•</span>
                  <span>Hosted on enterprise cloud infrastructure (Vercel/Supabase)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ack-blue mt-1">•</span>
                  <span>Automated daily backups</span>
                </li>
              </ul>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-8 border border-ack-blue/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-ack-black">ADA Accessibility</h3>
              </div>
              <p className="text-ack-dark-gray">
                Searchable transcripts improve accessibility for deaf/hard-of-hearing citizens. Multilingual search supports non-English speakers.
              </p>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-8 border border-ack-blue/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-ack-black">Data Storage & Access</h3>
              </div>
              <p className="text-ack-dark-gray">
                Source videos: Town retains control on YouTube/Vimeo<br/>
                Transcripts: Stored on US-based servers<br/>
                Access: Public by default (public meetings only)
              </p>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-6 border border-ack-blue/30">
            <p className="text-ack-dark-gray text-center">
              <span className="font-semibold text-ack-black">Questions from IT?</span> Happy to provide detailed technical specifications and security documentation.
            </p>
          </div>
        </div>
      </section>

      {/* Slide 8: Example Questions (moved from slide 5) */}
      <section
        id="slide-old"
        className="hidden"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Example Questions Citizens Can Ask
          </h2>

          <div className="space-y-4">
            <div className="bg-ack-light-gray rounded-xl p-6 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🏗️</div>
                <div className="flex-1">
                  <p className="text-ack-black font-medium mb-2">
                    "What were the main concerns raised about the waterfront development project?"
                  </p>
                  <p className="text-sm text-ack-dark-gray">
                    → Finds all mentions across multiple meetings with exact timestamps
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-6 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🚗</div>
                <div className="flex-1">
                  <p className="text-ack-black font-medium mb-2">
                    "Has the Select Board discussed electric vehicle charging stations?"
                  </p>
                  <p className="text-sm text-ack-dark-gray">
                    → Surfaces all relevant discussions with context and outcomes
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-6 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💰</div>
                <div className="flex-1">
                  <p className="text-ack-black font-medium mb-2">
                    "What did the board say about the proposed budget increase for public schools?"
                  </p>
                  <p className="text-sm text-ack-dark-gray">
                    → Provides summaries with direct quotes and voting records
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-6 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🏖️</div>
                <div className="flex-1">
                  <p className="text-ack-black font-medium mb-2">
                    "When was beach access discussed and what was decided?"
                  </p>
                  <p className="text-sm text-ack-dark-gray">
                    → Timeline of all related discussions with decisions highlighted
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-light-gray rounded-xl p-6 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🌍</div>
                <div className="flex-1">
                  <p className="text-ack-black font-medium mb-2">
                    "¿Qué decidió la junta sobre las regulaciones de alquiler a corto plazo?"
                  </p>
                  <p className="text-sm text-ack-dark-gray">
                    → Works in any language, improving accessibility for all residents
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-ack-dark-gray italic">
              Try it yourself at <Link href="/" className="text-ack-blue hover:underline font-semibold">ackindex.com</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Slide 6: Benefits */}
      <section
        id="slide-5"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-12 text-center">
            Benefits for Nantucket
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Save Staff Time</h3>
                  <p className="text-ack-dark-gray">
                    Reduce hours spent manually searching old meeting minutes or answering "What was said about X?" inquiries.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Increase Transparency</h3>
                  <p className="text-ack-dark-gray">
                    Make government meetings truly accessible - citizens can find what was discussed without watching hours of video.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Language Access</h3>
                  <p className="text-ack-dark-gray">
                    Non-English speakers can ask questions in their native language, improving equity and community engagement.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Cost Effective</h3>
                  <p className="text-ack-dark-gray">
                    Fully automated - no manual transcription needed. Lower cost than expanding staff or traditional transcription services.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Historical Archive</h3>
                  <p className="text-ack-dark-gray">
                    Builds a searchable archive of town decisions over time - invaluable for planning, research, and institutional knowledge.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ack-black mb-2">Usage Analytics</h3>
                  <p className="text-ack-dark-gray">
                    See what topics citizens care about most - data-driven insights to inform communication and decision-making.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 9: Historical Archive Options */}
      <section
        id="slide-9"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8 text-center">
            Historical Archive Options
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 text-center max-w-3xl mx-auto">
            Beyond ongoing meeting transcription, we can backfill Nantucket's meeting archive to create a searchable record of past decisions.
          </p>

          <div className="bg-ack-blue/5 rounded-xl p-6 mb-8 border border-ack-blue/20">
            <p className="text-ack-dark-gray text-center">
              <span className="font-semibold text-ack-black">Proof of concept:</span> I've already transcribed October and November 2025's Select Board meetings — over 5,000 minutes of content now searchable on AckIndex.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Option 1: Year to Date */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20 hover:border-ack-blue/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-ack-black">2025 YTD</h3>
                <div className="text-3xl">📅</div>
              </div>
              <p className="text-ack-dark-gray mb-4">
                Index all Select Board meetings from January 2025 to present for quick access to current-year decisions
              </p>
              <div className="pt-4 border-t border-ack-blue/20">
                <p className="text-sm text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Scope:</span> Current year only
                </p>
                <p className="text-sm text-ack-dark-gray mt-2">
                  <span className="font-semibold text-ack-black">Value:</span> Immediate searchability for recent topics
                </p>
              </div>
            </div>

            {/* Option 2: Targeted Years */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/40 hover:border-ack-blue/70 transition-colors relative">
              <div className="absolute -top-3 right-4 bg-ack-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-ack-black">3 Year Archive</h3>
                <div className="text-3xl">📚</div>
              </div>
              <p className="text-ack-dark-gray mb-4">
                Index meetings from 2022-2025, capturing recent decisions and ongoing projects
              </p>
              <div className="pt-4 border-t border-ack-blue/20">
                <p className="text-sm text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Scope:</span> Last 3 years
                </p>
                <p className="text-sm text-ack-dark-gray mt-2">
                  <span className="font-semibold text-ack-black">Value:</span> Context for current initiatives
                </p>
              </div>
            </div>

            {/* Option 3: Complete Archive */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20 hover:border-ack-blue/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-ack-black">7 Year Archive</h3>
                <div className="text-3xl">🏛️</div>
              </div>
              <p className="text-ack-dark-gray mb-4">
                Complete historical archive from 2018-2025 for comprehensive institutional knowledge
              </p>
              <div className="pt-4 border-t border-ack-blue/20">
                <p className="text-sm text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Scope:</span> Full 7-year record
                </p>
                <p className="text-sm text-ack-dark-gray mt-2">
                  <span className="font-semibold text-ack-black">Value:</span> Track multi-year trends & policy evolution
                </p>
              </div>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-8 border border-ack-blue/30">
            <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why Historical Data Matters
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">• Long-term Projects:</span> Track multi-year initiatives like waterfront development or infrastructure projects
                </p>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">• Policy Evolution:</span> See how regulations and bylaws have changed over time
                </p>
              </div>
              <div>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">• Institutional Memory:</span> Preserve knowledge even as staff and board members change
                </p>
                <p className="text-ack-dark-gray mb-2">
                  <span className="font-semibold text-ack-black">• Research & Planning:</span> Enable data-driven decisions based on past outcomes
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-ack-dark-gray italic">
              All options include ongoing transcription of new meetings going forward
            </p>
          </div>
        </div>
      </section>

      {/* Slide 10: Zero-Risk Pilot Program */}
      <section
        id="slide-10"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-ack-blue/5 to-ack-blue/10"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8 text-center">
            Zero-Risk Pilot Program
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 text-center max-w-3xl mx-auto">
            Try AckIndex with no commitment. See the value firsthand before making any decisions.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Month 1 */}
            <div className="bg-ack-white rounded-xl p-8 border-2 border-ack-blue/30">
              <div className="text-center mb-4">
                <div className="inline-block bg-ack-blue text-white text-lg font-bold px-4 py-2 rounded-full mb-3">
                  Month 1
                </div>
                <h3 className="text-3xl font-bold text-ack-black mb-2">FREE</h3>
                <p className="text-sm text-ack-dark-gray">No obligation trial</p>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Index all December 2025 Select Board meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Demo with town staff</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Gather feedback & usage metrics</span>
                </li>
              </ul>
            </div>

            {/* Month 2-3 */}
            <div className="bg-ack-white rounded-xl p-8 border-2 border-ack-blue/50 relative">
              <div className="absolute -top-3 right-4 bg-ack-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="text-center mb-4">
                <div className="inline-block bg-ack-blue text-white text-lg font-bold px-4 py-2 rounded-full mb-3">
                  Months 2-3
                </div>
                <h3 className="text-3xl font-bold text-ack-black mb-2">$1,750<span className="text-lg text-ack-dark-gray">/mo</span></h3>
                <p className="text-sm text-ack-dark-gray">50% discount</p>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Ongoing transcription of all meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Limited staff rollout for testing</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Monthly usage reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Cancel anytime, no penalty</span>
                </li>
              </ul>
            </div>

            {/* After Month 3 */}
            <div className="bg-ack-white rounded-xl p-8 border-2 border-ack-blue/30">
              <div className="text-center mb-4">
                <div className="inline-block bg-ack-blue text-white text-lg font-bold px-4 py-2 rounded-full mb-3">
                  After Month 3
                </div>
                <h3 className="text-3xl font-bold text-ack-black mb-2">$3,500<span className="text-lg text-ack-dark-gray">/mo</span></h3>
                <p className="text-sm text-ack-dark-gray">Full service</p>
              </div>
              <ul className="space-y-3 text-ack-dark-gray">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Continue at full rate OR</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Cancel with 30 days notice</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No long-term contracts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Full feature access</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-ack-white rounded-xl p-8 mb-8 border-2 border-ack-blue/30">
            <h3 className="text-2xl font-bold text-ack-black mb-6 text-center">Next Step</h3>
            <p className="text-ack-dark-gray text-center mb-6">
              Schedule a <span className="font-semibold text-ack-black">30-minute live demo</span> with Town Manager and IT Director to see the system working with actual Nantucket meetings from October and November 2025 (already indexed).
            </p>
            <div className="flex justify-center gap-4">
              <a href="mailto:owen@ackindex.com?subject=AckIndex%20Demo%20Request%20-%20Town%20of%20Nantucket" className="inline-block">
                <button className="bg-ack-blue hover:bg-ack-blue/90 text-white font-bold px-8 py-4 rounded-lg transition-colors">
                  Schedule Demo
                </button>
              </a>
              <a href="https://ackindex.com" target="_blank" rel="noopener noreferrer" className="inline-block">
                <button className="bg-ack-white hover:bg-ack-light-gray text-ack-blue border-2 border-ack-blue font-bold px-8 py-4 rounded-lg transition-colors">
                  Try Live Site
                </button>
              </a>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-6 border border-ack-blue/30 text-center">
            <p className="text-ack-dark-gray">
              <span className="font-semibold text-ack-black">Contact:</span> Owen Hudson, Founder<br/>
              <a href="mailto:owen@ackindex.com" className="text-ack-blue hover:underline">owen@ackindex.com</a> | <a href="https://ackindex.com" className="text-ack-blue hover:underline">ackindex.com</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
