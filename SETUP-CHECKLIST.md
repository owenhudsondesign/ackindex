# AckIndex Setup Checklist

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project
- OpenAI API key
- Apify account (optional, for URL scraping)
- Resend account (optional, for email)

---

## Setup Steps

### 1. ✅ Extract and Install Dependencies
- [x] Archive extracted from `ackindex-stage8.tar.gz`
- [x] Ran `npm install` successfully

### 2. ⚙️ Configure Environment Variables

Edit `.env.local` in the `ackindex` directory and fill in the following:

```env
# Supabase Configuration (Get from Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration (Required for embeddings and chat)
OPENAI_API_KEY=sk-your-openai-key-here

# Apify Configuration (For URL scraping)
APIFY_API_TOKEN=your-apify-token-here
APIFY_ACTOR_ID=apify/website-content-crawler

# Resend Email Configuration
RESEND_API_KEY=your-resend-key-here
CONTACT_EMAIL=your-email@example.com
```

**Where to get these values:**
- **Supabase:** Dashboard → Project Settings → API
- **OpenAI:** https://platform.openai.com/api-keys
- **Apify:** https://console.apify.com/account/integrations
- **Resend:** https://resend.com/api-keys

### 3. 🗄️ Database Setup in Supabase

#### Step 3.1: Run Initial Schema
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste and click **Run**
5. Verify success (should see "Success" message)

#### Step 3.2: Run Stage 8 Migration (Vector Embeddings)
1. In the same SQL Editor
2. Copy the contents of `supabase-migration-stage8.sql`
3. Paste and click **Run**
4. Verify success - you should see:
   - "Stage 8 vector embeddings migration completed successfully!"
   - `pgvector` extension installed

**Verify installation:**
```sql
-- Check if extensions are installed
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pg_trgm');

-- Check embedding stats
SELECT * FROM embedding_stats;
```

### 4. 🚀 Start the Development Server

Once environment variables are configured:

```bash
cd ackindex
npm run dev
```

The application will start at `http://localhost:3000`

### 5. 👤 Create Your First Admin User

#### Option A: Using Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add User**
3. Enter email and password
4. **Important:** Copy the user ID (UUID)
5. Execute this SQL to make them admin:
```sql
-- Replace 'USER_UUID_HERE' with your actual user ID
INSERT INTO auth.users (id, email) 
VALUES ('USER_UUID_HERE', 'your-email@example.com')
ON CONFLICT DO NOTHING;
```

#### Option B: Using Sign Up Flow (if implemented)
1. Navigate to `http://localhost:3000/admin/login`
2. Sign up with your email
3. Check Supabase Dashboard → Authentication for the new user

### 6. 📄 Upload Your First Document

1. Log in to the admin panel (`http://localhost:3000/admin`)
2. You'll see two upload options:

#### Option A: Upload PDF
- Click "Upload PDF" button
- Select a PDF file
- Wait for processing (typically 10-30 seconds)
- Check status in the activity feed

#### Option B: Scrape URL
- Enter a URL to scrape
- Click "Scrape URL"
- Wait for Apify to process (typically 30-60 seconds)

### 7. 🧬 Generate Embeddings

After uploading your first document:

1. Scroll down to the **"Vector Embeddings"** card in the admin panel
2. Click **"Generate Embeddings"** button
3. Wait for processing (typically 30 seconds to 2 minutes for small documents)
4. You'll see progress updates as embeddings are generated
5. **Cost:** ~$0.05 per 1000 chunks

**Verify embeddings were generated:**
```sql
SELECT * FROM embedding_stats;
-- Should show chunks_with_embeddings > 0
```

### 8. 💬 Test the Chatbot

1. Navigate to the home page (`http://localhost:3000`)
2. In the chat interface, ask a question related to your uploaded document
   - Example: "What is this document about?"
   - Example: "Summarize the key points"
3. **Expected result:** You should get a response with:
   - A relevant answer based on your document
   - Citations showing source information
   - Relevance scores for each source

### 9. ✅ Verify Everything Works

Test these scenarios:

- [ ] **Basic query:** Ask a question about uploaded content → Get relevant answer
- [ ] **Unknown query:** Ask something not in your documents → Get "I don't have that information"
- [ ] **Citations:** Check that sources are properly cited
- [ ] **Multiple documents:** Upload 2-3 documents and verify the chatbot uses all of them

---

## Troubleshooting

### "pgvector extension is not installed"
**Fix:** 
1. Go to Supabase Dashboard → Database → Extensions
2. Search for "vector" and enable it
3. Re-run the Stage 8 migration

### Embeddings not generating
**Possible causes:**
- OpenAI API key not set or invalid
- No chunks in database (upload a document first)
- Check browser console and server logs for errors

### Chat returns "I don't have that information" for everything
**Possible causes:**
1. Embeddings not generated yet → Generate them in admin panel
2. Similarity threshold too high → Embedded in code (contact developer)
3. Query embedding failed → Check OpenAI API key

### "401 Unauthorized" errors
**Fix:**
- Verify your Supabase credentials in `.env.local`
- Check that RLS policies are set up correctly
- Try logging out and back in

---

## Next Steps

Now that your AckIndex is set up:

1. **Upload more content** - Add your documents, PDFs, and URLs
2. **Monitor costs** - Track OpenAI API usage
3. **Customize** - Adjust similarity thresholds, number of retrieved chunks
4. **Deploy** - Ready to deploy to production!

For more details, see:
- `STAGE-8-COMPLETE.md` - Full technical documentation
- Supabase documentation: https://supabase.com/docs
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings

