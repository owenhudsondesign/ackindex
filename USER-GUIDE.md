# AckIndex User Guide

## Welcome to AckIndex! 🎉

AckIndex is a knowledge base chatbot powered by RAG (Retrieval Augmented Generation). It lets you upload documents (PDFs, URLs) and chat with them using AI.

---

## Quick Start

### 1. Set Up Your Account

1. Go to the admin login page
2. Sign up with your email (or log in if you have an account)
3. You'll be redirected to the admin dashboard

### 2. Upload Your First Document

#### Upload a PDF:
1. Click **"Upload PDF"** button in the admin panel
2. Select your PDF file
3. Wait for processing (10-30 seconds)
4. The document will appear in the activity feed

#### Scrape a URL:
1. Enter a URL in the **"Scrape URL"** field
2. Click **"Scrape URL"** button
3. Wait for scraping to complete (30-60 seconds)
4. The content will be added to your knowledge base

### 3. Generate Embeddings

After uploading a document:

1. Scroll down to the **"Vector Embeddings"** card
2. Click **"Generate Embeddings"** button
3. Wait for processing (30 seconds to 2 minutes)
4. You'll see progress updates as embeddings are generated

**Note:** Embeddings are required for the chatbot to work. Without embeddings, the chatbot won't be able to answer questions about your documents.

### 4. Chat with Your Documents

1. Navigate to the home page
2. In the chat interface, type your question
3. Press Enter or click the send button
4. Get an AI-powered answer based on your uploaded content!

**Example questions:**
- "What is this document about?"
- "Summarize the key points"
- "What were the main findings?"
- "Tell me about [specific topic]"

---

## Features

### Document Management

**Upload PDFs:**
- Drag and drop PDF files
- Supported formats: PDF
- Automatic text extraction and chunking

**Scrape URLs:**
- Enter any public URL
- Automatically extracts text content
- Preserves structure and formatting

**View Activity:**
- Recent uploads shown in the activity feed
- See status of each document (pending, processing, completed, failed)
- View upload timestamp and file details

### Vector Embeddings

**Generate Embeddings:**
- Converts your document chunks into semantic vectors
- Enables semantic search and retrieval
- Required for chatbot to answer questions

**Monitor Embeddings:**
- View embedding statistics
- See how many chunks have embeddings
- Track embedding coverage percentage

### Chat Interface

**Ask Questions:**
- Natural language queries
- Get answers grounded in your documents
- Citations show sources and relevance scores

**Conversation History:**
- Chat maintains context across messages
- Follow-up questions are understood in context

**Citations:**
- Every answer includes source citations
- Click on citations to jump to source
- Relevance scores show confidence levels

---

## Tips for Best Results

### Upload Quality Documents

✅ **Do:**
- Upload well-structured documents
- Use documents with clear text (not scanned images)
- Upload related documents together

❌ **Don't:**
- Upload password-protected PDFs
- Use images without OCR text
- Upload corrupted files

### Ask Clear Questions

✅ **Good questions:**
- "What are the main findings in the report?"
- "Summarize the methodology used"
- "What recommendations were made?"

❌ **Less effective:**
- "Stuff" or "whatever"
- Questions unrelated to your documents
- Yes/no questions without context

### Generate Embeddings

⚠️ **Important:** Always generate embeddings after uploading new documents. The chatbot cannot answer questions without embeddings.

**Cost:** Generating embeddings has a small cost (~$0.05 per 1000 chunks), but you only need to do it once per document.

---

## Understanding Citations

Every answer from the chatbot includes **citations** showing where the information came from.

**Citation format:**
```
[Source 1] Document Title (85% relevance)
[Source 2] Another Document (78% relevance)
```

**What this means:**
- **[Source 1, 2]** - Which documents/chunks were used
- **Document Title** - Name of the source document
- **Relevance %** - How relevant the source is to your question (0-100%)

**Relevance scores:**
- **90-100%:** Highly relevant, very confident
- **70-89%:** Relevant, confident
- **50-69%:** Somewhat relevant, moderate confidence
- **<50%:** Low relevance (usually won't be shown)

---

## Troubleshooting

### "I don't have that information"

**Possible causes:**
1. **No embeddings generated** - Go to admin panel and click "Generate Embeddings"
2. **Question doesn't match content** - Try rephrasing your question
3. **Document not uploaded yet** - Upload the relevant document first

**Fix:** Try asking a more general question or check if embeddings were generated.

### Chat is slow

**Possible causes:**
1. Large documents taking time to search
2. Network latency
3. OpenAI API rate limits

**Fix:** Be patient, or try breaking down into smaller questions.

### Citations not showing

**Cause:** Issue with document metadata or chunking.

**Fix:** 
1. Check if embeddings were generated successfully
2. Verify the document was processed correctly
3. Try re-uploading the document

### Error uploading file

**Possible causes:**
1. File is too large
2. Unsupported file format
3. Network error

**Fix:** 
1. Try a smaller file
2. Verify it's a PDF
3. Check your internet connection
4. Try again

---

## Advanced Usage

### Multiple Documents

Upload multiple related documents to build a comprehensive knowledge base:

1. Upload all documents you want to include
2. Generate embeddings for all of them
3. Ask questions that span multiple documents
4. The chatbot will synthesize information from all sources

### Specific Topics

Ask specific questions about topics covered in your documents:

- "What does the document say about [topic]?"
- "Explain [concept] from the document"
- "What were the conclusions about [issue]?"

### Follow-up Questions

Ask follow-up questions in the same conversation:

**Example:**
- You: "What is the main topic?"
- Chatbot: [Answer about main topic]
- You: "Tell me more about that"
- Chatbot: [Elaborates on main topic]

---

## Best Practices

### 1. Organize Your Documents

Upload documents in a logical order or group related documents together. This helps the chatbot provide better context.

### 2. Generate Embeddings Promptly

Generate embeddings right after uploading. This ensures the chatbot is ready to answer questions immediately.

### 3. Use Clear Language

When asking questions, use clear, specific language. This helps the semantic search find the right information.

### 4. Review Citations

Always check the citations to verify where information came from. This helps you understand the confidence level of the answer.

### 5. Test with Different Questions

Try asking the same information in different ways to see how the chatbot handles various question formats.

---

## Security and Privacy

**Your data:**
- Uploaded documents are stored securely in Supabase
- Only authenticated users can access their documents
- Embeddings are stored in an encrypted database

**API usage:**
- Queries and documents are sent to OpenAI for processing
- OpenAI's privacy policy applies to API interactions
- No data is used to train OpenAI models

**Best practices:**
- Don't upload sensitive information without reviewing security settings
- Regularly review uploaded documents
- Use strong authentication credentials

---

## Support

For technical issues or questions:

1. Check the troubleshooting section above
2. Review the setup documentation
3. Check Supabase and OpenAI status pages
4. Contact support if needed

---

## Next Steps

Now that you're set up:

1. ✅ Upload your documents
2. ✅ Generate embeddings
3. ✅ Start chatting!

**Ready to go!** Happy indexing! 🚀

