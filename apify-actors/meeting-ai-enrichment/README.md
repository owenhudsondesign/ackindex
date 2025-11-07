# Meeting AI Enrichment (Actor 3)

AI-powered enrichment of meeting transcripts using OpenAI GPT for ackindex integration.

## Features

- **Structured Analysis**: Extracts meetings, attendees, decisions, action items, key quotes
- **Semantic Summaries**: Creates searchable summaries optimized for RAG/semantic search
- **Smart Categorization**: Tags meetings with relevant categories (zoning, budget, etc.)
- **Video Timestamps**: Identifies key moments with timestamps for direct video navigation
- **Embeddings Generation**: Creates vector embeddings for semantic search
- **Multiple Output Formats**: ackindex-optimized, Elasticsearch-ready, or generic JSON
- **Cost Tracking**: Calculates and reports API costs per video

## Input Schema

```json
{
  "datasetId": "abc123def456",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o-mini",
  "outputFormat": "ackindex",
  "enableEmbeddings": true,
  "categories": ["zoning", "budget", "public safety"],
  "maxTokens": 4096
}
```

### Parameters

- **datasetId** (string, required): Dataset ID from Actor 2 (transcription-processor)
- **openaiApiKey** (string, required): OpenAI API key
- **openaiModel** (string): Model to use - `"gpt-4o-mini"` (default, cheap), `"gpt-4o"`, or `"gpt-4-turbo"`
- **outputFormat** (string): `"ackindex"` (default), `"elasticsearch"`, or `"json"`
- **enableEmbeddings** (boolean): Generate vector embeddings (default: true)
- **categories** (array): Categories for tagging meetings
- **maxTokens** (integer): Max tokens for GPT response (default: 4096)

## OpenAI Model Comparison

| Model | Input Cost | Output Cost | Speed | Best For |
|-------|-----------|-------------|-------|----------|
| **gpt-4o-mini** ⭐ | $0.15/1M | $0.60/1M | ⚡⚡⚡ | Production (recommended) |
| gpt-4o | $2.50/1M | $10/1M | ⚡⚡ | Highest accuracy |
| gpt-4-turbo | $10/1M | $30/1M | ⚡ | Legacy |

**Recommendation**: Use **gpt-4o-mini** for the best balance of cost and quality.

## Output Format (ackindex)

```json
{
  "videoId": "abc123",
  "url": "https://youtube.com/watch?v=abc123",
  "embedUrl": "https://youtube.com/watch?v=abc123",
  "meeting": {
    "date": "2025-01-15",
    "type": "Town Council Regular Meeting",
    "attendees": ["Mayor Smith", "Councilor Jones", "Town Manager Brown"],
    "location": "Nantucket Town Government"
  },
  "summary": {
    "executive": "The council voted 5-2 to approve the zoning changes for downtown development...",
    "searchable": "Town council meeting January 2025 zoning changes downtown development affordable housing budget allocation...",
    "keyPoints": ["Zoning reform", "Affordable housing", "Budget allocation"],
    "decisions": [
      {
        "motion": "Approve zoning changes for downtown",
        "outcome": "Passed",
        "vote": "5-2"
      }
    ],
    "actionItems": [
      {
        "task": "Draft affordable housing proposal",
        "deadline": "February 15, 2025",
        "responsible": "Planning Department"
      }
    ]
  },
  "transcript": {
    "full": "Full transcript text...",
    "segments": [...],
    "wordCount": 15420,
    "speakers": 5,
    "duration": 3600
  },
  "topics": ["zoning", "housing", "budget"],
  "quotes": [
    {
      "quote": "We need more affordable housing options for our residents",
      "speaker": "Mayor Smith",
      "context": "Discussion of zoning changes"
    }
  ],
  "videoTimestamps": {
    "public_comment": 850,
    "zoning_vote": 2100,
    "budget_discussion": 2850
  },
  "metadata": {
    "channel": "Nantucket Town Government",
    "channelId": "UCxxxxx",
    "title": "Town Council Meeting - January 15, 2025",
    "uploadDate": "2025-01-15",
    "viewCount": 1250,
    "transcriptionService": "deepgram",
    "aiModel": "gpt-4o-mini"
  },
  "embedding": [0.123, -0.456, ...], // 1536-dimensional vector
  "costs": {
    "transcription": 0.26,
    "openai": 0.12,
    "embedding": 0.00002,
    "total": 0.38
  },
  "processedAt": "2025-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Example 1: Basic enrichment with embeddings

```json
{
  "datasetId": "abc123",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true
}
```

### Example 2: High-accuracy mode (GPT-4o)

```json
{
  "datasetId": "abc123",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o",
  "enableEmbeddings": true
}
```

### Example 3: Elasticsearch output

```json
{
  "datasetId": "abc123",
  "openaiApiKey": "sk-...",
  "outputFormat": "elasticsearch",
  "enableEmbeddings": true
}
```

## Cost Estimates

### Scenario: 100 town meeting videos (1 hour each, ~15k words)

| Component | Cost per Video | Total (100 videos) |
|-----------|----------------|-------------------|
| Transcription (Deepgram) | $0.26 | $26.00 |
| GPT-4o-mini Analysis | $0.12 | $12.00 |
| Embeddings | $0.00002 | $0.002 |
| **Total** | **$0.38** | **$38.00** |

### Monthly Cost (4 meetings/week)

- 4 meetings/week × 4 weeks = 16 meetings/month
- 16 videos × $0.38 = **$6.08/month**

### Cost Breakdown by Model

**GPT-4o-mini** (recommended):
- Input: 15k words ≈ 20k tokens × $0.15/1M = $0.003
- Output: 1k tokens × $0.60/1M = $0.0006
- **Total per video: ~$0.004** ⭐

**GPT-4o** (high accuracy):
- Input: 20k tokens × $2.50/1M = $0.05
- Output: 1k tokens × $10/1M = $0.01
- **Total per video: ~$0.06**

**100x cost difference** between mini and full GPT-4o!

## Video Timestamps

The actor automatically identifies key moments and generates video timestamps you can use in your UI:

```javascript
// Example: Generate YouTube URL with timestamp
const moment = outputData.videoTimestamps.zoning_vote; // 2100 seconds
const videoUrl = `${outputData.url}&t=${moment}s`;
// Result: https://youtube.com/watch?v=abc123&t=2100s
```

## Integration with ackindex

The output is optimized for direct import into your ackindex database:

```javascript
// In your ackindex ingestion script
const dataset = await Actor.openDataset(datasetId);
const { items } = await dataset.getData();

for (const meeting of items) {
  // Insert into your PostgreSQL database
  await db.query(`
    INSERT INTO meetings (video_id, date, type, summary, transcript, embedding)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    meeting.videoId,
    meeting.meeting.date,
    meeting.meeting.type,
    meeting.summary.searchable,
    meeting.transcript.full,
    meeting.embedding
  ]);
}
```

## Local Testing

```bash
# Install dependencies
cd apify-actors/meeting-ai-enrichment
npm install

# Create input
cat > .actor/INPUT.json << EOF
{
  "datasetId": "your-dataset-id-from-actor-2",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4o-mini",
  "enableEmbeddings": true
}
EOF

# Run locally
npm start
```

## Deployment to Apify

```bash
# Login and push
apify login
apify push

# Run on Apify
apify call your-username/meeting-ai-enrichment \
  --input '{"datasetId": "abc123", "openaiApiKey": "sk-...", "openaiModel": "gpt-4o-mini"}'
```

## Error Handling

- **Transcript not found**: Skipped with error record in output
- **OpenAI API errors**: Retried with exponential backoff
- **JSON parsing errors**: Fallback to basic structure with raw text
- **Rate limits**: 2-second delay between videos

## Performance

- **Processing time**: ~10-30 seconds per 1-hour meeting
- **Throughput**: ~120 meetings/hour with gpt-4o-mini
- **Bottleneck**: OpenAI API rate limits (adjust maxConcurrent if needed)

## Embeddings

Generates 1536-dimensional vectors using `text-embedding-3-small`:

- **Purpose**: Semantic search, similarity matching
- **Cost**: $0.02 per 1M tokens (~$0.00002 per embedding)
- **Input**: Uses the `searchableSummary` field (100-150 words)
- **Use case**: "Find meetings about affordable housing" → cosine similarity search

## Categories

Default categories automatically tagged:
- zoning
- budget
- public safety
- infrastructure
- education
- health
- environment
- transportation
- housing
- economic development

Customize via the `categories` input parameter.

## Next Steps

After running this actor:

1. **Download the dataset** from Apify
2. **Import into ackindex** database using the ingestion script
3. **Test semantic search** with the embeddings
4. **Implement video player** with timestamp navigation

## Troubleshooting

### "Transcript not found in KVS"
- Verify Actor 2 completed successfully
- Check that transcriptKey exists in Actor 2's output
- Verify KVS is accessible

### "OpenAI API error: 429 Rate Limit"
- Increase delay between requests
- Check your OpenAI account quota/billing
- Consider upgrading to higher rate limit tier

### "JSON parsing failed"
- This is expected occasionally - fallback structure is used
- Check that `response_format: json_object` is enabled
- Consider using gpt-4o for better JSON compliance

### High costs
- Use **gpt-4o-mini** instead of gpt-4o (100x cheaper!)
- Disable embeddings if not needed
- Reduce `maxTokens` to limit output length
- Process videos in smaller batches

## Best Practices

1. **Use gpt-4o-mini**: 100x cheaper than gpt-4o with excellent quality
2. **Enable embeddings**: Essential for semantic search in ackindex
3. **Monitor costs**: Check logs after each run
4. **Test with 1 video**: Validate setup before processing full dataset
5. **Save to database incrementally**: Don't wait for entire batch to complete

## Support

For issues:
- Check Apify logs for detailed error messages
- Verify OpenAI API key has sufficient credits
- Test with a single video first
- Compare outputs across different models if quality concerns

---

**Ready for production!** This actor is optimized for cost-effectiveness and seamlessly integrates with your ackindex search system.
