import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <PageLayout>
      <Container className="py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            About AckIndex
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            AI-powered transcription and search for Nantucket town meetings. Making local government transparent and accessible.
          </p>
        </div>

        {/* Banner Image */}
        <div className="mb-10 rounded-xl overflow-hidden">
          <Image
            src="/hero-image.jpg"
            alt="Nantucket"
            width={1200}
            height={514}
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Our Mission</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            AckIndex makes Nantucket town meetings searchable. We transcribe every meeting with AI,
            then let you ask questions in plain English. No more scrolling through hours of video
            or reading hundred-page PDFs. Get the information you need in seconds.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">How It Works</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            <strong>1. Transcription:</strong> We automatically transcribe town meeting videos and audio
            using state-of-the-art speech recognition. Every word is captured with timestamps for easy reference.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            <strong>2. AI Indexing:</strong> Our AI analyzes transcripts to understand context, identify
            key decisions, track votes, and extract action items. Everything is semantically indexed for instant search.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            <strong>3. Smart Search:</strong> Ask questions in plain English. Get exact quotes with timestamps
            and links to the source video. You can verify every answer yourself.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">What You Can Search</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            Currently indexing: Select Board meetings, Town Council meetings, Planning Board meetings,
            Public Hearings, and Special Town Meetings. We&apos;re continuously adding more meetings
            going back several years.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Transparency & Accuracy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            Every answer includes timestamped citations. Click any quote to jump to that exact moment
            in the source video. Our AI never makes up information—if we don&apos;t have the answer
            in our database, we&apos;ll tell you. All transcripts are from official public meetings.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Get Involved</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Have a meeting you&apos;d like us to index? Notice an error in a transcript? Want to help
            improve the project? Reach out via our contact page. AckIndex is built for the community.
          </p>
        </div>
      </Container>
    </PageLayout>
  );
}

