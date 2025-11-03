import type { Metadata } from "next";
import "./globals.css";
import SentryInit from "@/components/SentryInit";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AckIndex - Nantucket Civic Data Made Accessible",
  description: "Making Nantucket's civic data accessible and understandable through AI-powered analysis.",
  keywords: ["Nantucket", "civic data", "government", "transparency"],
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
