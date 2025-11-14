import type { Metadata } from "next";
import "./globals.css";
import SentryInit from "@/components/SentryInit";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AckIndex - Search Nantucket Town Meetings Instantly",
  description: "AI-powered search for Nantucket town meetings. Find decisions, votes, and discussions in seconds with timestamped transcripts from all boards.",
  keywords: [
    "Nantucket town meetings",
    "Nantucket Select Board",
    "Nantucket Town Council",
    "Nantucket Planning Board",
    "town meeting minutes Nantucket",
    "Nantucket public hearings",
    "Nantucket government",
    "Nantucket civic meetings",
    "search town meetings",
    "Nantucket meeting transcripts",
    "Nantucket local government",
    "Nantucket board meetings",
    "Nantucket town decisions",
    "Nantucket zoning board",
    "Nantucket special town meeting"
  ],
  openGraph: {
    title: "AckIndex - Search Nantucket Town Meetings Instantly",
    description: "AI-powered search for Nantucket town meetings. Find decisions, votes, and discussions in seconds with timestamped transcripts.",
    type: "website",
    locale: "en_US",
    siteName: "AckIndex",
    url: "https://www.ackindex.com",
    images: [
      {
        url: "https://www.ackindex.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "AckIndex - Search Nantucket Town Meetings Instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AckIndex - Search Nantucket Town Meetings Instantly",
    description: "AI-powered search for Nantucket town meetings. Find decisions, votes, and discussions in seconds with timestamped transcripts.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <SentryInit />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
