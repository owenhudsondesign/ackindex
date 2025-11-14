/**
 * Structured data (JSON-LD) for SEO
 * Helps search engines understand our site's purpose and content
 */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "AckIndex",
  "applicationCategory": "GovernmentApplication",
  "description": "Search and transcription platform for Nantucket town meetings, including Select Board meetings, Town Council, Planning Board, and public hearings.",
  "url": "https://ackindex.com",
  "keywords": "Nantucket town meetings, Select Board, Town Council, Planning Board, meeting transcripts, local government, public hearings, Nantucket MA",
  "audience": {
    "@type": "Audience",
    "audienceType": "Nantucket residents, real estate professionals, journalists, researchers, local government stakeholders"
  },
  "featureList": [
    "Search all Nantucket town meetings",
    "Timestamped meeting transcripts",
    "Select Board meeting search",
    "Town Council meeting search",
    "Planning Board meeting search",
    "Public hearing transcripts",
    "Voting record search",
    "Decision tracking"
  ],
  "serviceArea": {
    "@type": "Place",
    "name": "Nantucket, Massachusetts",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "41.2835",
      "longitude": "-70.0995"
    }
  },
  "provider": {
    "@type": "Organization",
    "name": "AckIndex",
    "description": "Local government transparency platform for Nantucket"
  }
};

export const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://ackindex.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Nantucket Town Meetings",
      "item": "https://ackindex.com"
    }
  ]
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AckIndex",
  "applicationCategory": "GovernmentApplication",
  "operatingSystem": "Web",
  "description": "AI-powered search for Nantucket town meetings. Search Select Board, Planning Board, and Town Council meetings with timestamped transcripts.",
  "url": "https://www.ackindex.com",
  "areaServed": {
    "@type": "City",
    "name": "Nantucket",
    "containedIn": {
      "@type": "State",
      "name": "Massachusetts"
    }
  },
  "serviceType": "Government Meeting Search",
  "keywords": "Nantucket town meetings, Select Board, Planning Board, Town Council, meeting search, transcripts",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available with 50,000 tokens per month"
  }
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I search Nantucket town meetings?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AckIndex lets you search all Nantucket town meetings in plain English. Simply ask a question about any Select Board meeting, Town Council meeting, Planning Board meeting, or public hearing, and get timestamped quotes with links to source videos."
      }
    },
    {
      "@type": "Question",
      "name": "What Nantucket meetings are searchable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can search Select Board meetings, Town Council meetings, Planning Board meetings, Public Hearings, Special Town Meetings, and other official Nantucket government meetings. All meetings are fully transcribed with timestamps."
      }
    },
    {
      "@type": "Question",
      "name": "How do I find Nantucket Select Board decisions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Search AckIndex for specific topics, votes, or decisions. Our platform indexes all Select Board meetings with vote counts, decision details, and timestamped quotes you can verify in the source video."
      }
    },
    {
      "@type": "Question",
      "name": "Are Nantucket town meeting transcripts accurate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "All transcripts are generated from official Nantucket town meeting videos using professional speech recognition. Every answer includes timestamped citations so you can verify the information in the source video yourself."
      }
    }
  ]
};
