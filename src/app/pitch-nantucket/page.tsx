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
    { id: 5, title: 'Partnership Options' },
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
            Making Nantucket's Government<br/>
            <span className="text-ack-blue">Accessible to Everyone</span>
          </h1>

          <p className="text-xl md:text-2xl text-ack-dark-gray mb-8 max-w-3xl mx-auto">
            The Select Board has identified language accessibility as a priority for improving civic engagement. AckIndex makes every town meeting instantly accessible in any language, 24/7.
          </p>

          <p className="text-lg text-ack-dark-gray mb-12 max-w-2xl mx-auto">
            No more waiting for translations. No more reading through hundred-page transcripts. Citizens ask questions in their native language and get instant answers with exact meeting timestamps.
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
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8 text-center">
            The Challenge
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 text-center max-w-3xl mx-auto">
            Nantucket's government meetings contain crucial information about zoning, permits, development, and town decisions. But accessing this information is difficult.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-ack-white p-6 rounded-xl border-2 border-ack-blue/30">
              <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-ack-black mb-2">Meeting Transcripts Are Hundreds of Pages Long</h3>
              <p className="text-sm text-ack-dark-gray">
                Finding specific discussions about permits or zoning buried in dense PDFs
              </p>
            </div>

            <div className="bg-ack-white p-6 rounded-xl border-2 border-ack-blue/30">
              <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-ack-black mb-2">Important Discussions Get Lost</h3>
              <p className="text-sm text-ack-dark-gray">
                Critical decisions about development and town policy are hard to track over time
              </p>
            </div>

            <div className="bg-ack-white p-6 rounded-xl border-2 border-ack-blue/30">
              <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-ack-black mb-2">Non-English Speakers Struggle to Participate</h3>
              <p className="text-sm text-ack-dark-gray">
                Language barriers prevent full community engagement in civic matters
              </p>
            </div>

            <div className="bg-ack-white p-6 rounded-xl border-2 border-ack-blue/30">
              <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-ack-black mb-2">Dense PDFs Discourage Civic Engagement</h3>
              <p className="text-sm text-ack-dark-gray">
                Current meeting records make transparency and engagement goals difficult to achieve
              </p>
            </div>
          </div>

          <div className="mt-8 bg-ack-blue/10 rounded-xl p-6 border border-ack-blue/30 text-center">
            <p className="text-ack-dark-gray">
              <span className="font-semibold text-ack-black">The Select Board has identified</span> language accessibility and civic engagement as priorities — but current meeting records make both goals difficult to achieve.
            </p>
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
            The Solution
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-8">
            Instant Answers
            <span className="block text-ack-blue mt-2">In Any Language</span>
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 max-w-3xl mx-auto">
            AckIndex makes every town meeting instantly searchable. Citizens ask questions in plain English (or Spanish, Portuguese, any language) and get answers in seconds with exact timestamps and video links.
          </p>

          <div className="bg-ack-light-gray rounded-2xl p-8 md:p-12 mb-8 border border-ack-blue/20">
            <div className="aspect-video bg-ack-white rounded-xl flex items-center justify-center mb-6 border-2 border-ack-blue/20">
              <div className="text-center max-w-2xl mx-auto p-6">
                <div className="bg-ack-light-gray rounded-xl shadow-lg p-6">
                  <div className="flex items-start gap-3 text-left mb-4">
                    <div className="w-8 h-8 bg-ack-dark-gray rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="bg-ack-white rounded-lg p-3 text-sm text-ack-black border border-ack-blue/20">
                        What's the status of the new community center project?
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
                      <div className="bg-ack-blue/10 border border-ack-blue/30 rounded-lg p-3 text-sm text-ack-black leading-relaxed">
                        The Planning Board approved the community center design on February 28, 2024.<sup className="text-ack-blue font-semibold">[1]</sup> The project budget was set at $12.5 million<sup className="text-ack-blue font-semibold">[2]</sup>, with construction expected to begin in Summer 2024.<sup className="text-ack-blue font-semibold">[3]</sup> The facility will include a gymnasium, meeting rooms, and a senior center.<sup className="text-ack-blue font-semibold">[1]</sup>
                        <div className="mt-3 pt-3 border-t border-ack-blue/20 text-xs text-ack-dark-gray">
                          <span className="font-medium">💡 Click citations to view sources</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-ack-dark-gray">Ask questions in any language, get answers with exact meeting timestamps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-ack-light-gray p-5 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="font-bold text-ack-black mb-2 text-sm">100+ Languages</h3>
              <p className="text-xs text-ack-dark-gray">Search in any language</p>
            </div>
            <div className="bg-ack-light-gray p-5 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-bold text-ack-black mb-2 text-sm">Instant Answers</h3>
              <p className="text-xs text-ack-dark-gray">Exact timestamps</p>
            </div>
            <div className="bg-ack-light-gray p-5 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-bold text-ack-black mb-2 text-sm">Video Links</h3>
              <p className="text-xs text-ack-dark-gray">Jump to exact moments</p>
            </div>
            <div className="bg-ack-light-gray p-5 rounded-xl border border-ack-blue/20">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-bold text-ack-black mb-2 text-sm">Fully Automated</h3>
              <p className="text-xs text-ack-dark-gray">No staff time required</p>
            </div>
          </div>

          <div className="bg-ack-blue text-white rounded-xl p-6 text-center">
            <p className="font-semibold text-lg">
              AckIndex is already live with Nantucket's October 2024 Select Board meetings
            </p>
            <a
              href="https://ackindex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-6 py-2 bg-white text-ack-blue rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Try It Now →
            </a>
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
                  <span><strong>AI transcription</strong> of all Select Board meetings</span>
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

      {/* New Slide: RAG Technology & Accuracy */}
      <section
        id="slide-rag"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-ack-blue/5 via-white to-ack-blue/10"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-ack-blue/10 text-ack-blue px-4 py-2 rounded-full text-sm font-semibold mb-6">
              Technology Deep Dive
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-6">
              How RAG Technology
              <span className="block text-ack-blue mt-2">Ensures Accurate Answers</span>
            </h2>
            <p className="text-xl text-ack-dark-gray max-w-3xl mx-auto">
              AckIndex uses Retrieval Augmented Generation (RAG) — a proven AI architecture that dramatically reduces hallucinations by grounding every answer in your actual meeting transcripts.
            </p>
          </div>

          {/* RAG Process Visualization */}
          <div className="bg-white rounded-2xl p-8 mb-8 border-2 border-ack-blue/20 shadow-lg">
            <h3 className="text-2xl font-bold text-ack-black mb-6 text-center">How RAG Works</h3>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Step 1: Retrieval */}
              <div className="relative">
                <div className="bg-ack-blue/10 rounded-xl p-6 border-2 border-ack-blue/30 h-full">
                  <div className="w-12 h-12 bg-ack-blue rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h4 className="font-bold text-ack-black mb-3 text-center">🔍 Retrieval</h4>
                  <p className="text-sm text-ack-dark-gray text-center">
                    Your question searches through <strong>all meeting transcripts</strong> to find the most relevant passages
                  </p>
                </div>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-ack-blue text-3xl">
                  →
                </div>
              </div>

              {/* Step 2: Augmentation */}
              <div className="relative">
                <div className="bg-ack-blue/10 rounded-xl p-6 border-2 border-ack-blue/30 h-full">
                  <div className="w-12 h-12 bg-ack-blue rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h4 className="font-bold text-ack-black mb-3 text-center">📚 Augmentation</h4>
                  <p className="text-sm text-ack-dark-gray text-center">
                    Retrieved passages are <strong>injected directly</strong> into the AI's context as source material
                  </p>
                </div>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-ack-blue text-3xl">
                  →
                </div>
              </div>

              {/* Step 3: Generation */}
              <div>
                <div className="bg-ack-blue/10 rounded-xl p-6 border-2 border-ack-blue/30 h-full">
                  <div className="w-12 h-12 bg-ack-blue rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h4 className="font-bold text-ack-black mb-3 text-center">✨ Generation</h4>
                  <p className="text-sm text-ack-dark-gray text-center">
                    AI writes an answer <strong>based only on the retrieved text</strong>, citing exact sources
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-ack-blue/5 rounded-lg p-4 border border-ack-blue/20">
              <p className="text-sm text-ack-dark-gray text-center">
                <strong className="text-ack-blue">Key Difference:</strong> Unlike ChatGPT (which generates from memory), RAG answers are <em>constrained</em> to only use your actual meeting transcripts as source material.
              </p>
            </div>
          </div>

          {/* Hallucination Comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Without RAG */}
            <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✕</span>
                </div>
                <h4 className="font-bold text-red-900">Without RAG (Standard AI)</h4>
              </div>
              <ul className="space-y-2 text-sm text-red-900">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>AI generates answers from its training data (may be outdated or generic)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span><strong>High hallucination risk:</strong> AI may "make up" plausible-sounding facts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>No source citations or verification possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Cannot access your specific meeting content</span>
                </li>
              </ul>
            </div>

            {/* With RAG */}
            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <h4 className="font-bold text-green-900">With RAG (AckIndex)</h4>
              </div>
              <ul className="space-y-2 text-sm text-green-900">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>AI answers strictly from retrieved meeting transcripts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><strong>Minimizes hallucinations:</strong> AI can only use information that actually exists in your meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Every answer includes source citations with timestamps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Users can verify answers against original video</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Accuracy Statement */}
          <div className="bg-ack-blue text-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Does RAG Eliminate Hallucinations?</h3>
            <p className="text-lg opacity-95 mb-4 max-w-3xl mx-auto">
              RAG <strong>dramatically reduces</strong> hallucinations but doesn't eliminate them entirely. The AI can still misinterpret transcript text or make minor errors.
            </p>
            <p className="text-lg opacity-95 max-w-3xl mx-auto">
              That's why <strong>every answer includes source citations</strong> — users can click through to verify information against the original meeting video. This transparency is RAG's greatest strength.
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

          {/* What Town Partnership Includes */}
          <div className="bg-ack-blue/10 rounded-2xl p-8 border-2 border-ack-blue/50">
            <h3 className="text-2xl font-bold text-ack-black mb-6 text-center">What a Town Partnership Includes</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">AI meeting transcription service</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Multilingual access in 100+ languages</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Searchable permanent records with timestamps</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">All residents get unlimited FREE access</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Staff dashboard with analytics</span>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Priority support and corrections</span>
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
                  <span className="text-ack-dark-gray">Flexible contract terms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 7: Partnership Options */}
      <section
        id="slide-6"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-4 text-center">
            Flexible Partnership Options
          </h2>
          <p className="text-lg text-ack-dark-gray mb-12 text-center max-w-3xl mx-auto">
            Let's discuss what works best for Nantucket — pricing tailored to your needs and budget
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Ongoing Transcription */}
            <div className="bg-white rounded-xl p-8 border-2 border-ack-blue/30">
              <div className="text-4xl mb-4 text-center">📝</div>
              <h3 className="text-2xl font-bold text-ack-black mb-4 text-center">Ongoing Transcription</h3>
              <p className="text-ack-dark-gray mb-6">
                Monthly service for all current Select Board meetings with instant multilingual search access
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Automatic transcription</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">100+ language support</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Unlimited searches</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Usage analytics</span>
                </div>
              </div>
            </div>

            {/* Historical Archive */}
            <div className="bg-white rounded-xl p-8 border-2 border-ack-blue/50 relative">
              <div className="absolute -top-3 right-4 bg-ack-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                FLEXIBLE
              </div>
              <div className="text-4xl mb-4 text-center">📚</div>
              <h3 className="text-2xl font-bold text-ack-black mb-4 text-center">Historical Archive</h3>
              <p className="text-ack-dark-gray mb-6">
                Backfill prior years to create searchable institutional memory — scope based on your priorities
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Current year (2025)</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">3-year archive (2022-2025)</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">7-year archive (2018-2025)</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Custom timeframe</span>
                </div>
              </div>
            </div>

            {/* Custom Solutions */}
            <div className="bg-white rounded-xl p-8 border-2 border-ack-blue/30">
              <div className="text-4xl mb-4 text-center">⚙️</div>
              <h3 className="text-2xl font-bold text-ack-black mb-4 text-center">Custom Solutions</h3>
              <p className="text-ack-dark-gray mb-6">
                Expand beyond meetings to other boards, document archives, or custom integrations
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Planning Board meetings</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">School Committee meetings</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Document archives</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-ack-dark-gray">Staff dashboard access</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-8 border-2 border-ack-blue/30 text-center">
            <h3 className="text-xl font-bold text-ack-black mb-3">Let's Discuss What Works for Nantucket</h3>
            <p className="text-ack-dark-gray max-w-2xl mx-auto">
              Every town has different needs and budget realities. We'll work with you to create a partnership that delivers language accessibility and civic engagement within your constraints — whether that's starting with ongoing meetings only, adding historical archives incrementally, or a comprehensive solution from day one.
            </p>
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
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-4 text-center">
            What Nantucket Gets
          </h2>
          <p className="text-lg text-ack-dark-gray mb-12 text-center max-w-3xl mx-auto">
            AckIndex augments your town staff and expands resident access — without replacing anyone
          </p>

          <div className="mb-12">
            <h3 className="text-2xl font-bold text-ack-black mb-6">For Residents</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-ack-black mb-2">24/7 Multilingual Access</h4>
                    <p className="text-ack-dark-gray">
                      Ask questions in Spanish, Portuguese, or any of 100+ languages. Get instant answers anytime, without language barriers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-ack-black mb-2">Instant Answers with Timestamps</h4>
                    <p className="text-ack-dark-gray">
                      No more watching hours of video to find one decision. Jump directly to the exact moment a topic was discussed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-2xl font-bold text-ack-black mb-6">For Town Staff</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-ack-black mb-2">Handle Complex Inquiries</h4>
                    <p className="text-ack-dark-gray">
                      AckIndex handles routine questions like "What was decided about X?" so staff can focus on complex, nuanced inquiries that require human judgment.
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
                    <h4 className="text-xl font-bold text-ack-black mb-2">Searchable Institutional Knowledge</h4>
                    <p className="text-ack-dark-gray">
                      Instantly find past decisions, context, and discussion history. Never lose track of what was decided and when.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-ack-black mb-6">For Town Leadership</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-ack-white rounded-xl p-8 border-l-4 border-ack-blue">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-ack-black mb-2">Achieve Language Accessibility Goals</h4>
                    <p className="text-ack-dark-gray">
                      Deliver on the Select Board's stated priority to make government more accessible to non-English speakers.
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
                    <h4 className="text-xl font-bold text-ack-black mb-2">Data-Driven Insights</h4>
                    <p className="text-ack-dark-gray">
                      See what topics residents search for most. Understand community priorities and inform communication strategies.
                    </p>
                  </div>
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

      {/* New Slide: Future Expansion Possibilities */}
      <section
        id="slide-future"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-light-gray"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-ack-blue/10 text-ack-blue px-4 py-2 rounded-full text-sm font-semibold mb-6">
              Looking Ahead
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-6">
              Future Expansion Possibilities
            </h2>
            <p className="text-xl text-ack-dark-gray max-w-3xl mx-auto">
              Once meeting transcription is established, AckIndex can expand to become a comprehensive searchable archive of all town documents and records.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Document Types */}
            <div className="bg-white rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-2xl font-bold text-ack-black mb-6 flex items-center gap-3">
                <span className="text-3xl">📁</span>
                Additional Document Types
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Town Reports & Studies</p>
                    <p className="text-sm text-ack-dark-gray">Annual reports, feasibility studies, impact assessments</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Planning & Zoning Documents</p>
                    <p className="text-sm text-ack-dark-gray">Bylaws, zoning maps, site plans, variance applications</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Budget & Financial Records</p>
                    <p className="text-sm text-ack-dark-gray">Annual budgets, financial statements, audit reports</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Policy Documents</p>
                    <p className="text-sm text-ack-dark-gray">Employee handbooks, procedure manuals, contract templates</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-ack-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Historical Archives</p>
                    <p className="text-sm text-ack-dark-gray">Town charters, historical bylaws, archived correspondence</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-2xl font-bold text-ack-black mb-6 flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                Expansion Benefits
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">One-Stop Search</p>
                    <p className="text-sm text-ack-dark-gray">Find any town document from a single search interface</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Cross-Reference Power</p>
                    <p className="text-sm text-ack-dark-gray">Connect related information across different document types</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Staff Efficiency</p>
                    <p className="text-sm text-ack-dark-gray">Reduce time spent searching for reference documents</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Comprehensive Transparency</p>
                    <p className="text-sm text-ack-dark-gray">Make all public records easily discoverable by residents</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-ack-black">Institutional Knowledge</p>
                    <p className="text-sm text-ack-dark-gray">Preserve organizational memory as personnel change</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-8 border border-ack-blue/30 text-center">
            <h3 className="text-xl font-bold text-ack-black mb-4">Phase-Based Approach</h3>
            <p className="text-ack-dark-gray max-w-3xl mx-auto mb-4">
              Document expansion can be implemented gradually after meeting transcription is established. Start with the most valuable document types and expand based on staff feedback and usage patterns.
            </p>
            <p className="text-sm text-ack-dark-gray italic">
              This roadmap ensures the town gets immediate value from meeting transcription while building toward a comprehensive knowledge management system.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="slide-faq"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-ack-white"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-ack-black mb-4 text-center">
            Common Questions
          </h2>
          <p className="text-lg text-ack-dark-gray mb-12 text-center">
            Addressing concerns about AI and civic technology
          </p>

          <div className="space-y-6">
            {/* Question 1: Job Replacement */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                Will AckIndex replace town staff or clerks?
              </h3>
              <p className="text-ack-dark-gray mb-3">
                <strong className="text-ack-black">No — AckIndex augments staff, it doesn't replace them.</strong>
              </p>
              <p className="text-ack-dark-gray mb-3">
                Town clerks and staff handle complex, nuanced requests that require human judgment, context, and relationships. AckIndex handles routine factual questions like "What was decided about X?" or "When did the board discuss Y?" — freeing up staff to focus on higher-value work.
              </p>
              <p className="text-ack-dark-gray">
                Think of it like a self-checkout lane at a store: it serves people who want quick, simple transactions, while staff handle everything that needs expertise or personal attention.
              </p>
            </div>

            {/* Question 2: Accuracy */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">✓</span>
                How accurate is the AI?
              </h3>
              <p className="text-ack-dark-gray mb-3">
                AckIndex uses <strong className="text-ack-black">Retrieval Augmented Generation (RAG)</strong> — the AI only answers based on actual transcript text, not general knowledge. Every answer includes citations with exact timestamps so users can verify the source.
              </p>
              <p className="text-ack-dark-gray">
                Transcription accuracy is typically 95%+, comparable to professional human transcription. The AI doesn't hallucinate answers because it only uses the transcripts you provide — if information isn't in the transcript, it says "I don't have that information."
              </p>
            </div>

            {/* Question 3: Data Security */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                What about data security and privacy?
              </h3>
              <p className="text-ack-dark-gray mb-3">
                All meeting transcripts are <strong className="text-ack-black">already public record</strong> — AckIndex just makes them searchable. We don't create new public information, we organize what's already public.
              </p>
              <p className="text-ack-dark-gray">
                Data is hosted on enterprise-grade cloud infrastructure with encryption at rest and in transit. The town retains full ownership of all transcripts and can export or delete data at any time.
              </p>
            </div>

            {/* Question 4: What if AI gives wrong answer */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                What if the AI gives a wrong answer?
              </h3>
              <p className="text-ack-dark-gray mb-3">
                Every answer includes <strong className="text-ack-black">clickable citations with timestamps</strong> linking back to the original source. Users can immediately verify any claim by watching the actual meeting video at that exact moment.
              </p>
              <p className="text-ack-dark-gray">
                Staff can also flag incorrect answers for review, and we'll make corrections. The system improves over time as we refine transcripts and tune the search algorithm.
              </p>
            </div>

            {/* Question 5: Cost vs hiring translator */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                Why not just hire a translator or bilingual staff member?
              </h3>
              <p className="text-ack-dark-gray mb-3">
                <strong className="text-ack-black">Even with bilingual staff, you can only cover 2-3 languages.</strong> AckIndex provides access in 100+ languages simultaneously, 24/7, at a fraction of the cost of hiring multilingual staff.
              </p>
              <p className="text-ack-dark-gray">
                Plus, it solves the transparency problem for everyone — not just non-English speakers. Residents who speak English still benefit from instant searchable access instead of watching hours of video.
              </p>
            </div>

            {/* Question 6: Implementation timeline */}
            <div className="bg-ack-light-gray rounded-xl p-8 border-2 border-ack-blue/20">
              <h3 className="text-xl font-bold text-ack-black mb-4 flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                How long does implementation take?
              </h3>
              <p className="text-ack-dark-gray">
                <strong className="text-ack-black">AckIndex can be live within days.</strong> We just need access to meeting video URLs (YouTube, Vimeo, or direct links). Transcription happens automatically, and the search interface is ready to use immediately. No software installation or IT changes required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA: Next Steps */}
      <section
        id="slide-10"
        className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-ack-blue/5 to-ack-blue/10"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-ack-black mb-6">
            Let's Make Nantucket's Government<br/>
            <span className="text-ack-blue">Accessible to Everyone</span>
          </h2>

          <p className="text-xl text-ack-dark-gray mb-12 max-w-2xl mx-auto">
            Schedule a discovery call to discuss Nantucket's specific needs, priorities, and how AckIndex can help achieve your language accessibility goals.
          </p>

          <div className="bg-white rounded-2xl p-12 border-2 border-ack-blue/30 mb-12">
            <h3 className="text-2xl font-bold text-ack-black mb-8">What We'll Discuss</h3>

            <div className="grid md:grid-cols-2 gap-6 text-left mb-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-ack-black mb-2">Your Priorities</h4>
                  <p className="text-sm text-ack-dark-gray">Language accessibility goals, boards to cover, historical archive scope</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-ack-black mb-2">Partnership Options</h4>
                  <p className="text-sm text-ack-dark-gray">Flexible pricing based on your budget and implementation timeline</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-ack-black mb-2">Live Demo</h4>
                  <p className="text-sm text-ack-dark-gray">See AckIndex in action with Nantucket's October 2024 meetings already indexed</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-ack-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-ack-black mb-2">Next Steps</h4>
                  <p className="text-sm text-ack-dark-gray">Pilot program options, implementation timeline, technical requirements</p>
                </div>
              </div>
            </div>

            <div className="border-t border-ack-blue/20 pt-8">
              <a
                href="mailto:owen@ackindex.com?subject=Discovery Call - Nantucket Town Partnership"
                className="inline-block bg-ack-blue text-white text-lg font-bold px-10 py-4 rounded-lg hover:bg-ack-blue/90 transition-colors mb-4"
              >
                Schedule a Discovery Call
              </a>
              <p className="text-sm text-ack-dark-gray">
                or email <a href="mailto:owen@ackindex.com" className="text-ack-blue hover:underline font-semibold">owen@ackindex.com</a>
              </p>
            </div>
          </div>

          <div className="bg-ack-blue/10 rounded-xl p-6 border border-ack-blue/30">
            <p className="text-ack-dark-gray">
              <span className="font-semibold text-ack-black">Already live:</span> Try AckIndex now at <a href="https://ackindex.com" className="text-ack-blue hover:underline font-semibold">ackindex.com</a> with Nantucket's October 2024 Select Board meetings
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
