# AckIndex - Nantucket Civic Data Platform

Making Nantucket's civic data accessible and understandable through AI-powered analysis.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- Resend account (for email)
- Apify account (for web scraping)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ackindex/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Home page (chat interface)
│   │   ├── about/        # About page
│   │   ├── contact/      # Contact form
│   │   └── admin/        # Admin panel (auth protected)
│   ├── components/       # React components
│   └── lib/             # Utility functions & configurations
│       └── supabase.ts  # Supabase client setup
├── public/              # Static assets
│   └── logo.svg         # AckIndex logo
└── ...
```

## 🎨 Design System

### Colors
- **Primary Blue**: `#2e90c6` (ack-blue)
- **Dark Gray**: `#4d4d4d` (ack-dark-gray)
- **Black**: `#191919` (ack-black)
- **Light Gray**: `#efefef` (ack-light-gray)
- **White**: `#ffffff` (ack-white)

### Typography
- **Font**: Inter (Google Fonts)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with pgvector)
- **Auth**: Supabase Auth
- **Email**: Resend
- **Web Scraping**: Apify
- **AI/LLM**: OpenAI API
- **Deployment**: Vercel (recommended)

## 📝 Development Stages

- [x] **Stage 1**: Project Setup & Infrastructure ✅
- [ ] **Stage 2**: Layout & Design System
- [ ] **Stage 3**: Home Page & Chat UI
- [ ] **Stage 4**: Contact Page & Email Integration
- [ ] **Stage 5**: About Page
- [ ] **Stage 6**: Admin Panel - Authentication & UI
- [ ] **Stage 7**: Admin Panel - Scraping & Parsing
- [ ] **Stage 8**: Chatbot Backend - RAG System
- [ ] **Stage 9**: Chatbot Integration & Testing
- [ ] **Stage 10**: QA, Polish & Deployment

## 🔐 Environment Variables

See `.env.example` for required environment variables.

## 📄 License

MIT

## 🤝 Contributing

This is a civic technology project. Contributions welcome!
