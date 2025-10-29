# Apify Actor Deployment Checklist

## Files in .actor Directory

✅ `actor.json` - Actor configuration
✅ `input_schema.json` - Input schema definition

## Deploy via Apify CLI

```bash
cd "/Users/owenhudson/ackindex/Claude Apify Actors"
apify push
```

## Or Deploy Manually

Upload these files to Apify Console:
1. `.actor/actor.json`
2. `.actor/input_schema.json`

Then rebuild the actor.

## What This Fixes

- ❌ Before: Actor looked for `apify_actor_main.py` (doesn't exist)
- ✅ After: Actor uses `main.py` from Dockerfile

## After Deployment

Test with:
```json
{
  "startUrls": [{ "url": "https://mailchi.mp/nantucket-ma.gov/2025atm" }],
  "maxRequests": 5,
  "downloadPdfs": true
}
```

Expected result: Actor runs successfully and extracts content!

