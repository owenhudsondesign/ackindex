# Ack Index - Budget Analysis Tool

An AI-powered budget analysis and tracking tool for municipalities, built with Next.js, Supabase, and various AI services.

## Features

- 📊 Budget document parsing and analysis
- 🤖 AI-powered insights and categorization
- 💾 Supabase database integration
- 📧 Email notifications and subscriptions
- 💳 Stripe payment integration
- 🎨 Modern UI with Tailwind CSS

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

The `.env.local` file has been created with your API keys. Make sure all services are properly configured.

### 3. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL to create all necessary tables and sample data

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

The application uses the following main tables:

- `budgets` - Main budget documents
- `budget_categories` - Budget categories and amounts
- `budget_items` - Individual line items
- `analysis_results` - AI analysis results
- `subscriptions` - User subscriptions
- `users` - User accounts

## API Endpoints

- `POST /api/parse-budget` - Upload and parse budget PDFs
- `GET /api/budgets` - Retrieve budget data
- `POST /api/subscribe` - Subscribe to notifications

## Admin Features

- **Import Budgets**: Upload PDF documents for AI analysis
- **View Data**: Browse parsed budget information
- **Manage Subscriptions**: Handle user subscriptions

## Environment Variables

All required environment variables are configured in `.env.local`:

- Supabase configuration
- Anthropic API key
- OpenAI API key
- Stripe payment keys
- Email service keys (Resend, Mailgun)
- GitHub API key

## Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
├── database/              # Database schema
└── public/                # Static assets
```

### Key Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and auth
- **Anthropic Claude** - AI analysis
- **OpenAI** - Additional AI features
- **Stripe** - Payments
- **Resend/Mailgun** - Email services

## Deployment

The application is ready for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Support

For questions or issues, please refer to the documentation or contact support.
