# 🚀 AckIndex Quick Start Guide

Get AckIndex running locally in under 10 minutes!

## ⚡ Quick Start

### 1. Install Dependencies

```bash
cd ackindex-app
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to SQL Editor and run the contents of `supabase-setup.sql`
3. Go to Authentication → Users → Add User:
   - Email: `admin@ackindex.com`
   - Password: [Choose a secure password]

### 3. Get API Keys

**Option A: Anthropic Claude (Recommended)**
- Sign up at [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Copy it for next step

**Option B: OpenAI**
- Sign up at [platform.openai.com](https://platform.openai.com)
- Create an API key
- Copy it for next step

### 4. Configure Environment

Create `.env.local`:

```bash
# From Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your AI API Key (choose one)
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Test It Out

1. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Sign in with `admin@ackindex.com` and your password
3. Upload a sample PDF (any civic document or PDF)
4. Wait ~10-30 seconds for processing
5. Check the home page - your document should appear!

## 📁 Project Structure

```
ackindex-app/
├── app/
│   ├── page.tsx              ← Public dashboard (home page)
│   ├── admin/page.tsx        ← Admin upload interface
│   └── api/
│       ├── entries/route.ts  ← Fetch civic data
│       └── upload/route.ts   ← Upload & parse PDFs
├── components/               ← React components
├── lib/                      ← Utilities (AI, PDF, DB)
├── hooks/                    ← Custom React hooks
└── types/                    ← TypeScript definitions
```

## 🎯 What You Can Do Now

### Admin Tasks
- Upload PDFs of town documents
- View processing status
- See upload history

### Public Features
- Browse civic updates
- Filter by category
- Search across all documents
- View auto-generated charts
- Read AI-parsed summaries

## 🔧 Customization

### Change Colors

Edit `tailwind.config.js`:

```js
colors: {
  'ack-blue': '#5B8FB9',   // Your primary color
  'ack-sand': '#C7B299',   // Your accent color
}
```

### Switch AI Provider

In `app/api/upload/route.ts`:

```typescript
// Change from Claude to OpenAI:
import { parseDocumentWithOpenAI } from '@/lib/ai-parser';
const parsedData = await parseDocumentWithOpenAI(...);
```

### Modify Categories

Edit `types/index.ts`:

```typescript
export type Category = 'Budget' | 'Real Estate' | 'YourCategory';
```

## 📚 Documentation

- **README.md** - Full project documentation
- **DEPLOYMENT.md** - How to deploy to production
- **API.md** - API reference
- **SAMPLE_DATA.md** - Test data examples

## 🐛 Troubleshooting

### "Failed to fetch entries"
→ Check Supabase connection in `.env.local`  
→ Verify database tables exist (run `supabase-setup.sql`)

### "Upload failed"
→ Ensure API key is set correctly  
→ Check file is a PDF and under 10MB  
→ Verify storage bucket exists in Supabase

### Build errors
→ Run `npm install` again  
→ Delete `node_modules` and `.next`, reinstall

### Can't log in to admin
→ Verify user exists in Supabase Auth  
→ Check you're using the correct email/password

## 🚀 Next Steps

1. **Add Real Data**: Upload actual town documents
2. **Customize Design**: Adjust colors and layout
3. **Deploy**: Follow DEPLOYMENT.md to go live
4. **Share**: Let the community know about AckIndex!

## 💡 Tips

- Start with 3-5 sample documents to test
- PDFs with clear text parse better than scanned images
- Simpler documents (budgets, reports) work best initially
- Monitor Supabase usage to avoid hitting free tier limits
- Test on mobile - the design is fully responsive!

## 🎉 You're Ready!

AckIndex is now running. Start uploading civic documents and watch them transform into beautiful, accessible data.

Questions? Check the other documentation files or open an issue on GitHub.

---

**Made with ❤️ for transparent civic data**
