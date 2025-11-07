# Transcription Processor (Actor 2)

Transcribes audio files from YouTube videos using Deepgram, AssemblyAI, or OpenAI Whisper.

## Features

- **Multiple Services**: Supports Deepgram (recommended), AssemblyAI, and OpenAI Whisper
- **Speaker Diarization**: Identifies different speakers in meetings (Deepgram & AssemblyAI)
- **Timestamped Segments**: Returns transcript segments with precise timestamps
- **Cost Optimization**: Estimates costs before transcription, skips already-processed videos
- **Robust Error Handling**: Retries, rate limiting, and detailed error reporting
- **Key-Value Storage**: Stores full transcripts in Apify KVS for efficient access

## Input Schema

```json
{
  "datasetId": "abc123def456",
  "transcriptionService": "deepgram",
  "apiKey": "YOUR_API_KEY",
  "enableSpeakerDiarization": true,
  "language": "en",
  "maxConcurrent": 3,
  "model": "nova-2",
  "skipExisting": true
}
```

### Parameters

- **datasetId** (string, required): Dataset ID from Actor 1 (youtube-audio-downloader)
- **transcriptionService** (string, required): `"deepgram"`, `"assemblyai"`, or `"openai-whisper"`
- **apiKey** (string, required): API key for chosen service
- **enableSpeakerDiarization** (boolean): Identify speakers (default: true)
- **language** (string): Language code (default: "en")
- **maxConcurrent** (integer): Max concurrent requests (default: 3)
- **model** (string): Service-specific model (default: "nova-2" for Deepgram)
- **skipExisting** (boolean): Skip already transcribed videos (default: true)

## Transcription Service Comparison

| Feature | Deepgram (Recommended) | AssemblyAI | OpenAI Whisper |
|---------|------------------------|------------|----------------|
| **Cost/min** | $0.0043 | $0.0222 | $0.006 |
| **Speed** | ⚡⚡⚡ Fast | ⚡⚡ Medium | ⚡⚡⚡ Fast |
| **Speaker Diarization** | ✅ Yes | ✅ Yes | ❌ No |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Free Tier** | $200 credit | 5 hours free | No |
| **Best For** | Production | High accuracy | Quick tests |

**Recommendation**: Use **Deepgram** for the best balance of cost, speed, and features.

## Output Dataset

Each transcribed video produces:

```json
{
  "videoId": "abc123",
  "url": "https://youtube.com/watch?v=abc123",
  "title": "Town Council Meeting - January 2025",
  "channel": "Nantucket Town Government",
  "duration": 3600,
  "transcriptKey": "transcript_abc123.json",
  "transcriptText": "Welcome to the January town council meeting...",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Welcome to the January town council meeting.",
      "speaker": "Speaker 0"
    },
    {
      "start": 5.5,
      "end": 12.8,
      "text": "Today we'll be discussing the proposed zoning changes.",
      "speaker": "Speaker 1"
    }
  ],
  "wordCount": 15420,
  "speakers": 5,
  "confidence": 0.95,
  "transcriptionService": "deepgram",
  "estimatedCost": 0.258,
  "transcribeTime": 45.3,
  "status": "transcribed",
  "processedAt": "2025-01-15T10:30:00.000Z"
}
```

### Full Transcript (KVS)

The full transcript is stored in Key-Value Store with key `transcript_<videoId>.json`:

```json
{
  "videoId": "abc123",
  "videoUrl": "https://youtube.com/watch?v=abc123",
  "videoTitle": "Town Council Meeting - January 2025",
  "transcribedAt": "2025-01-15T10:30:00.000Z",
  "service": "deepgram",
  "language": "en",
  "duration": 3600,
  "wordCount": 15420,
  "speakers": 5,
  "confidence": 0.95,
  "fullText": "Full transcript text...",
  "segments": [...]
}
```

## Getting API Keys

### Deepgram (Recommended)
1. Sign up at [deepgram.com](https://deepgram.com/)
2. Get $200 free credit
3. Create API key in console
4. **Cost**: $0.0043/min ($0.26/hour)

### AssemblyAI
1. Sign up at [assemblyai.com](https://www.assemblyai.com/)
2. Get 5 hours free transcription
3. Get API key from dashboard
4. **Cost**: $0.0222/min ($1.33/hour)

### OpenAI Whisper
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Add payment method (no free tier)
3. Create API key
4. **Cost**: $0.006/min ($0.36/hour)

## Usage Examples

### Example 1: Deepgram with speaker diarization

```json
{
  "datasetId": "abc123",
  "transcriptionService": "deepgram",
  "apiKey": "your-deepgram-api-key",
  "enableSpeakerDiarization": true,
  "model": "nova-2"
}
```

### Example 2: AssemblyAI (highest accuracy)

```json
{
  "datasetId": "abc123",
  "transcriptionService": "assemblyai",
  "apiKey": "your-assemblyai-api-key",
  "enableSpeakerDiarization": true
}
```

### Example 3: OpenAI Whisper (no diarization)

```json
{
  "datasetId": "abc123",
  "transcriptionService": "openai-whisper",
  "apiKey": "sk-...",
  "enableSpeakerDiarization": false
}
```

## Local Testing

```bash
# Install dependencies
cd apify-actors/transcription-processor
npm install

# Create input
cat > .actor/INPUT.json << EOF
{
  "datasetId": "your-dataset-id-from-actor-1",
  "transcriptionService": "deepgram",
  "apiKey": "your-api-key",
  "enableSpeakerDiarization": true
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

# Run on Apify (pass Actor 1's dataset ID)
apify call your-username/transcription-processor \
  --input '{"datasetId": "abc123", "transcriptionService": "deepgram", "apiKey": "..."}'
```

## Cost Estimates

### Scenario: 100 town meeting videos (1 hour each)

| Service | Cost per Hour | Total Cost (100 hrs) |
|---------|---------------|----------------------|
| **Deepgram** | $0.26 | **$26** ⭐ |
| AssemblyAI | $1.33 | $133 |
| OpenAI Whisper | $0.36 | $36 |

**Winner**: Deepgram saves $10-100 vs competitors while maintaining excellent accuracy.

### Monthly Cost (4 meetings/week)

- 4 meetings/week × 4 weeks = 16 meetings/month
- 16 hours × $0.26 = **$4.16/month** with Deepgram

## Performance

- **Deepgram**: ~1-2 minutes to transcribe 1 hour of audio
- **AssemblyAI**: ~3-5 minutes to transcribe 1 hour of audio (includes polling)
- **OpenAI Whisper**: ~1-2 minutes to transcribe 1 hour of audio

## Error Handling

- **Missing audio files**: Skipped with warning
- **API rate limits**: Automatic retry with exponential backoff (2s delay between videos)
- **Service errors**: Recorded in dataset with status `transcription_failed`
- **Already transcribed**: Skipped if `skipExisting: true`

## Integration with Actor 3

Pass this actor's dataset to Actor 3:

```javascript
// In Actor 3
const datasetId = 'YOUR_DATASET_ID'; // From Actor 2's run
const dataset = await Actor.openDataset(datasetId);
const { items } = await dataset.getData();

for (const video of items) {
  if (video.status === 'transcribed') {
    // Load full transcript from KVS
    const transcript = await Actor.getValue(video.transcriptKey);
    // Process with Claude...
  }
}
```

## Troubleshooting

### "Audio file not found in KVS"
- Make sure Actor 1 completed successfully
- Check that `downloadAudio: true` was set in Actor 1
- Verify KVS keys in Actor 1's output

### "API quota exceeded"
- Check your API key's remaining credits
- Reduce `maxConcurrent` to avoid rate limits
- Contact service provider to increase quota

### "Transcription taking too long"
- AssemblyAI polls every 3 seconds until complete (normal)
- Very long videos (3+ hours) take longer to process
- Consider splitting videos or using Deepgram (faster)

## Best Practices

1. **Start with Deepgram**: Best balance of cost, speed, and features
2. **Enable speaker diarization**: Essential for meeting transcripts
3. **Skip existing transcripts**: Set `skipExisting: true` to avoid reprocessing
4. **Monitor costs**: Check estimated costs in logs before processing large batches
5. **Test with 1 video first**: Validate setup before processing entire dataset

## Next Steps

After running this actor:
1. Note the dataset ID from the run output
2. Pass it to **Actor 3 (AI Enrichment & ackindex Export)** for semantic processing
3. Check KVS for full transcript JSON files

## Support

For issues:
- Check Apify logs for detailed error messages
- Verify API key is valid and has credits remaining
- Test with a single video first
- Compare transcription quality across services if unsure
