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
            Making Nantucket&apos;s civic data accessible and understandable through AI-powered analysis.
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
            AckIndex is an independent civic technology project dedicated to making Nantucket&apos;s 
            government data more accessible to residents. We believe that informed citizens make 
            better decisions, and transparency is the foundation of good governance.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">How It Works</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            Our platform uses artificial intelligence to analyze and index public documents from 
            town meetings, planning boards, and other civic sources. When you ask a question, 
            AckIndex searches through this indexed data and provides answers with direct citations 
            to the source documents.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Transparency & Accuracy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            We&apos;re committed to accuracy and transparency. Every answer includes citations to 
            the original source documents, so you can verify the information yourself. If we 
            don&apos;t have enough information to answer your question, we&apos;ll tell you that too.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Get Involved</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            AckIndex is a community project. If you have suggestions for improvement, additional 
            data sources we should include, or would like to contribute to the project, please 
            reach out via our contact page.
          </p>
        </div>
      </Container>
    </PageLayout>
  );
}

