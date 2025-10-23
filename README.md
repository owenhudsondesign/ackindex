# 🏝️ ACK INDEX - AI-Powered Nantucket Project Tracker

A comprehensive web application that automatically scrapes, parses, and tracks building permits and development projects in Nantucket, Massachusetts. Built with Next.js, AI-powered parsing, and automated email notifications.

## 🚀 Features

### Core Functionality
- **🤖 AI-Powered Scraping**: Automatically extracts permit data from Nantucket government websites
- **📊 Real-Time Dashboard**: Beautiful, responsive dashboard showing current projects and permits
- **📧 Email Subscriptions**: Weekly digest emails with project updates
- **🗄️ Database Storage**: Persistent storage with Supabase for all permit data
- **⏰ Automated Jobs**: Daily scraping and weekly email digests via cron jobs
- **🔍 Smart Parsing**: AI extracts addresses, costs, project types, and status from raw text

### Technical Features
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for modern UI
- **Supabase** for database and authentication
- **OpenAI GPT-4** for intelligent data parsing
- **Resend** for email delivery
- **Playwright** for web scraping
- **Vercel** for deployment and cron jobs

## 📋 Prerequisites

Before setting up the project, you'll need accounts for:

- **Supabase** (Database) - [supabase.com](https://supabase.com)
- **OpenAI** (AI Parsing) - [openai.com](https://openai.com)
- **Resend** (Email) - [resend.com](https://resend.com)
- **Vercel** (Deployment) - [vercel.com](https://vercel.com)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ack-index
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your actual values in `.env.local`:
   ```env
   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Next.js Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=ACK INDEX
   
   # Supabase Database Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   
   # Resend Email Configuration
   RESEND_API_KEY=your_resend_api_key
   
   # Cron Job Security
   CRON_SECRET=your_random_cron_secret
   ```

## 🗄️ Database Setup

1. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be ready

2. **Run the database schema**
   - Go to SQL Editor in Supabase
   - Copy and paste the contents of `database/schema.sql`
   - Click "Run" to create all tables and indexes

3. **Get your API keys**
   - Go to Project Settings → API
   - Copy your Project URL and API keys

## 🚀 Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Visit the application**
   - Open [http://localhost:3000](http://localhost:3000)

3. **Test the scraping**
   ```bash
   npm run scrape
   ```

4. **Test email digest**
   ```bash
   npm run send-digest
   ```

## 📁 Project Structure

```
ack-index/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── cron/          # Automated job endpoints
│   │   ├── permits/       # Permit data endpoints
│   │   ├── subscribe/     # Email subscription
│   │   └── unsubscribe/   # Email unsubscription
│   ├── dashboard/         # Main dashboard page
│   ├── subscribe/         # Subscription page
│   └── unsubscribe/       # Unsubscription page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── Header.tsx        # Navigation header
│   └── Footer.tsx        # Site footer
├── lib/                  # Core business logic
│   ├── db.ts            # Database operations
│   ├── aiParser.ts      # AI-powered data parsing
│   ├── email.ts         # Email service
│   └── enhancedScraper.ts # Web scraping logic
├── scripts/             # Utility scripts
│   ├── scrapeNantucket.ts # Manual scraping
│   ├── sendDigest.ts    # Manual email digest
│   └── reset-db.ts      # Database reset
├── database/            # Database schema
│   └── schema.sql       # Complete database schema
└── vercel.json          # Vercel deployment config
```

## 🔄 Automated Workflows

### Daily Scraping (6 AM EST)
- Scrapes Nantucket government websites
- Parses data with AI
- Stores new permits in database
- Prevents duplicate entries

### Weekly Email Digest (Mondays 8 AM EST)
- Sends summary of new permits to subscribers
- Includes AI-generated project summaries
- Tracks delivery success/failure

## 🎯 API Endpoints

### Public Endpoints
- `GET /api/permits` - Get permits from database
- `GET /api/stats` - Get permit statistics
- `POST /api/subscribe` - Subscribe to email updates
- `POST /api/unsubscribe` - Unsubscribe from emails

### Admin Endpoints (Require CRON_SECRET)
- `GET /api/cron/scrape` - Trigger automated scraping
- `GET /api/cron/digest` - Trigger email digest
- `POST /api/cron/scrape` - Manual scraping trigger
- `POST /api/cron/digest` - Manual digest trigger

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables from `.env.local`
   - Deploy

3. **Set up Cron Jobs**
   - Cron jobs are automatically configured in `vercel.json`
   - Daily scraping at 6 AM EST
   - Weekly digest on Mondays at 8 AM EST

### Environment Variables for Production

Make sure to set these in Vercel:
- `NEXT_PUBLIC_APP_URL` - Your Vercel domain
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_KEY` - Your Supabase service key
- `OPENAI_API_KEY` - Your OpenAI API key
- `RESEND_API_KEY` - Your Resend API key
- `CRON_SECRET` - A random secret for cron job security

## 🧪 Testing

### Manual Testing
```bash
# Test scraping
npm run scrape

# Test email digest
npm run send-digest

# Test database operations
npm run db:reset
```

### API Testing
```bash
# Test permit API
curl http://localhost:3000/api/permits

# Test manual scraping
curl -X POST http://localhost:3000/api/cron/scrape

# Test manual digest
curl -X POST http://localhost:3000/api/cron/digest
```

## 🔧 Configuration

### Scraping Configuration
- Modify `lib/enhancedScraper.ts` to change scraping behavior
- Update target URLs in the scraper
- Adjust AI parsing prompts in `lib/aiParser.ts`

### Email Configuration
- Customize email templates in `lib/email.ts`
- Modify digest frequency in `vercel.json`
- Update sender information in email service

### Database Configuration
- Add new fields in `database/schema.sql`
- Update TypeScript types in `lib/db.ts`
- Modify database operations as needed

## 🐛 Troubleshooting

### Common Issues

1. **Scraping fails**
   - Check if Playwright browsers are installed: `npx playwright install`
   - Verify Nantucket website is accessible
   - Check timeout settings in scraper

2. **AI parsing errors**
   - Verify OpenAI API key is correct
   - Check API rate limits
   - Review parsing prompts for accuracy

3. **Email delivery fails**
   - Verify Resend API key
   - Check email templates for syntax errors
   - Ensure sender domain is configured

4. **Database connection issues**
   - Verify Supabase credentials
   - Check database schema is properly set up
   - Ensure RLS policies are correct

### Debug Mode
Set `NODE_ENV=development` to enable detailed logging.

## 📈 Monitoring

### Key Metrics to Track
- Number of permits scraped daily
- Email delivery success rate
- Database growth over time
- API response times
- Error rates and types

### Logs
- Vercel function logs show scraping and email activity
- Supabase logs show database operations
- OpenAI logs show AI parsing requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Town of Nantucket** for providing public permit data
- **OpenAI** for AI-powered data parsing
- **Supabase** for database infrastructure
- **Vercel** for hosting and cron jobs
- **Resend** for email delivery

## 📞 Support

For questions or issues:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

---

**Built with ❤️ for the Nantucket community**