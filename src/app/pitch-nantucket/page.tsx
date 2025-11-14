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
    { id: 3, title: 'Meeting Transcription' },
    { id: 4, title: 'AI Search' },
    { id: 5, title: 'Benefits' },
    { id: 6, title: 'Historical Archive' },
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
    <div className="min-h-screen bg-ack-white">
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
            AI-Powered Meeting Transcription
            <span className="block text-ack-blue mt-2">for Nantucket</span>
          </h1>

          <p className="text-xl md:text-2xl text-ack-dark-gray mb-12">
            Making Town Meeting Records Searchable & Accessible
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

      {/* Slide 4: Meeting Transcription */}
      <section
        id="slide-3"
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
                    State-of-the-art speech-to-text AI (AssemblyAI/Gladia) transcribes the entire meeting with speaker identification and precise timestamps.
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
              <span className="font-semibold text-ack-black">Already working:</span> AckIndex is currently indexing Nantucket Select Board meetings from YouTube at ackindex.com
            </p>
          </div>
        </div>
      </section>

      {/* Slide 5: AI Search */}
      <section
        id="slide-4"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
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

      {/* Slide 7: Historical Archive Options */}
      <section
        id="slide-6"
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
              <span className="font-semibold text-ack-black">Proof of concept:</span> I've already transcribed October 2024's Select Board meetings — over 5,000 minutes of content now searchable on AckIndex.
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

      {/* Slide 8: Next Steps */}
      <section
        id="slide-7"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-ack-blue/5 to-ack-blue/10"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8">
            Let's Partner
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 max-w-2xl mx-auto">
            AckIndex is already indexing Nantucket Select Board meetings. Let's discuss an official partnership to expand the service.
          </p>

          <div className="bg-ack-white rounded-2xl p-8 md:p-12 mb-8 border-2 border-ack-blue/30">
            <h3 className="text-2xl font-bold text-ack-black mb-6">Proposed Timeline</h3>

            <div className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-ack-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Discovery (1 week):</span> Meet with town staff to understand needs and identify additional meeting types to index
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-ack-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Pilot Program (1 month):</span> Limited rollout with town staff for testing and feedback
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-ack-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Public Launch:</span> Announce service to Nantucket residents with training materials
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-ack-blue rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <p className="text-ack-dark-gray">
                  <span className="font-semibold text-ack-black">Ongoing:</span> Continuous indexing of new meetings, feature improvements based on usage
                </p>
              </div>
            </div>
          </div>

          <div className="bg-ack-white rounded-xl p-8 mb-8 border border-ack-blue/20">
            <h3 className="text-xl font-bold text-ack-black mb-4">Get in Touch</h3>
            <div className="space-y-2 text-ack-dark-gray">
              <p className="text-lg">
                <span className="font-semibold text-ack-black">Owen Hudson</span>
              </p>
              <p>Founder, AckIndex</p>
              <p>
                <a href="mailto:owenhudsondesign@gmail.com" className="text-ack-blue hover:underline">
                  owenhudsondesign@gmail.com
                </a>
              </p>
              <p>
                <a href="https://ackindex.com" className="text-ack-blue hover:underline" target="_blank" rel="noopener noreferrer">
                  ackindex.com
                </a>
              </p>
            </div>
          </div>

          <div className="text-ack-dark-gray">
            <p className="text-sm">
              Thank you for considering AckIndex as a partner in making Nantucket's government more accessible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
