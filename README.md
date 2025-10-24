# AckIndex.com - Nantucket Civic Intelligence Dashboard

A modern, AI-powered civic data dashboard that transforms government PDFs into clear, visualized insights for Nantucket, Massachusetts.

## 🌟 Features

- **AI-Powered Document Parsing**: Automatically extracts key facts, metrics, and insights from civic PDFs
- **Beautiful Data Visualization**: Charts and metrics rendered elegantly using Recharts
- **Real-time Updates**: Live feed of civic updates with filtering and search
- **Admin Dashboard**: Simple upload interface for managing documents
- **Responsive Design**: Apple-inspired UI that works on all devices
- **Type-Safe**: Built with TypeScript for reliability

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS, Framer Motion
- **Database & Auth**: Supabase
- **AI**: Claude 3.5 Sonnet (Anthropic) or GPT-4o mini (OpenAI)
- **Charts**: Recharts
- **PDF Parsing**: pdf-parse
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Anthropic API key (or OpenAI API key)
- Vercel account (for deployment)

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

Create a new Supabase project at [supabase.com](https://supabase.com)

#### Create Database Tables

Run this SQL in the Supabase SQL Editor:

```sql
-- Create entries table
create table public.entries (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  source text not null,
  category text not null,
  summary text not null,
  key_metrics jsonb default '[]'::jsonb,
  visualizations jsonb default '[]'::jsonb,
  notable_updates jsonb default '[]'::jsonb,
  date_published date,
  document_excerpt text,
  file_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('civic-documents', 'civic-documents', false);

-- Enable RLS
alter table public.entries enable row level security;

-- Allow public read access to entries
create policy "Public read access"
  on public.entries for select
  using (true);

-- Allow authenticated users to insert entries
create policy "Authenticated insert access"
  on public.entries for insert
  with check (auth.role() = 'authenticated');

-- Storage policies
create policy "Public read access to documents"
  on storage.objects for select
  using (bucket_id = 'civic-documents');

create policy "Authenticated upload access"
  on storage.objects for insert
  with check (bucket_id = 'civic-documents' and auth.role() = 'authenticated');
```

#### Create Admin User

In Supabase Dashboard → Authentication → Users, create a user:
- Email: `admin@ackindex.com`
- Password: [Choose a secure password]

### 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Get these from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Choose one AI provider
ANTHROPIC_API_KEY=your_anthropic_key
# OR
OPENAI_API_KEY=your_openai_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🎯 Usage

### Public Dashboard (`/`)

- View civic updates in a clean, card-based feed
- Filter by category (Budget, Real Estate, Town Meeting, etc.)
- Search across all documents
- View auto-generated charts and metrics

### Admin Dashboard (`/admin`)

1. Navigate to `/admin`
2. Sign in with your Supabase credentials
3. Upload PDF documents
4. The AI will automatically:
   - Extract text from the PDF
   - Parse key facts and metrics
   - Generate visualizations
   - Store structured data
5. View upload history and status

## 🏗️ Project Structure

```
ackindex-app/
├── app/
│   ├── api/
│   │   ├── entries/          # Fetch civic entries
│   │   └── upload/           # Handle PDF uploads
│   ├── admin/                # Admin dashboard
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/
│   ├── ChartBlock.tsx        # Chart visualizations
│   ├── EntryCard.tsx         # Civic update card
│   ├── MetricChip.tsx        # Metric display
│   ├── CategoryTabs.tsx      # Category filters
│   ├── SearchBar.tsx         # Search input
│   ├── FeedGrid.tsx          # Entry grid layout
│   └── UploadForm.tsx        # Document upload form
├── hooks/
│   └── useEntries.ts         # Data fetching hooks
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── ai-parser.ts          # AI parsing logic
│   └── pdf-utils.ts          # PDF processing
└── types/
    └── index.ts              # TypeScript types
```

## 🎨 Design Philosophy

AckIndex follows Apple's design principles:

- **Clarity**: Information is easy to read and understand
- **Simplicity**: No unnecessary elements or complexity
- **Depth**: Visual layers and motion create hierarchy
- **Consistency**: Uniform design language throughout

Key design elements:
- Generous whitespace
- Rounded corners (2xl)
- Subtle shadows and borders
- Smooth transitions and animations
- Clean typography (Inter font)
- Muted color palette (blues, grays, sand tones)

## 🔧 Customization

### Colors

Edit `tailwind.config.js` to change the color scheme:

```js
colors: {
  'ack-blue': '#5B8FB9',    // Primary accent
  'ack-sand': '#C7B299',    // Secondary accent
  'ack-gray': '#6B7280',    // Text muted
  'ack-light': '#F9FAFB',   // Background
}
```

### AI Model

To switch between Claude and OpenAI, edit `app/api/upload/route.ts`:

```typescript
// Use Claude (default)
import { parseDocumentWithClaude } from '@/lib/ai-parser';
const parsedData = await parseDocumentWithClaude(extractedText, {...});

// Or use OpenAI
import { parseDocumentWithOpenAI } from '@/lib/ai-parser';
const parsedData = await parseDocumentWithOpenAI(extractedText, {...});
```

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
vercel --prod
```

## 📊 Data Flow

1. **Upload**: Admin uploads PDF via `/admin`
2. **Extract**: Server extracts text using pdf-parse
3. **Parse**: AI (Claude/GPT) structures the data into JSON
4. **Store**: Structured data saved to Supabase
5. **Display**: Public dashboard fetches and renders entries
6. **Visualize**: Charts auto-generated from parsed metrics

## 🔒 Security

- Admin routes protected by Supabase Auth
- RLS policies on database tables
- File size limits (10MB max)
- File type validation (PDF only)
- CORS protection on API routes
- Environment variables for secrets

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional chart types
- Export functionality
- Email notifications
- RSS feed
- Mobile app
- Advanced search
- Document versioning

## 📝 License

MIT License - feel free to use this for your own civic data projects!

## 🙏 Acknowledgments

Built with modern web technologies and AI to make civic data more accessible and beautiful.

---

**AckIndex** - Making local government transparent, one document at a time.
