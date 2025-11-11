# Long Video Processing - Quick Start

## 🚀 First Time Setup (5 minutes)

### 1. Get AssemblyAI API Key
```
1. Go to https://www.assemblyai.com/
2. Sign up (free - 100 hours/month)
3. Copy your API key
```

### 2. Add to .env.local
```bash
# Add this line to your .env.local file:
ASSEMBLYAI_API_KEY=your-key-here
```

### 3. Install Dependencies
```bash
cd /Users/owenhudson/ackindex
npm install
```

Done! You're ready to process long videos.

---

## 📹 Processing a Long Video (15 minutes)

### When You Get the Alert Email:

```
Subject: Manual Processing Needed
Video: Select Board Meeting - Jan 15
Duration: 185 minutes
Video URL: https://youtube.com/watch?v=abc123
```

### Step 1: Download Audio (5 min)
```
1. Open https://ytmp3.nu
2. Paste: https://youtube.com/watch?v=abc123
3. Click "Convert"
4. Download MP3 to ~/Downloads/
```

### Step 2: Run Script (10 min automated)
```bash
# Extract video ID from URL: abc123

tsx scripts/process-long-video.ts abc123 ~/Downloads/meeting.mp3
```

### Step 3: Wait & Done!
```
Script runs automatically:
- Uploads to AssemblyAI
- Transcribes (takes 15-30% of audio duration)
- Enriches with AI
- Stores in database
- Ready for search!
```

---

## 💰 Cost Per Video

**3-hour meeting example:**
- AssemblyAI: $1.95
- Your time: 15 min @ $30/hr = $7.50
- **Total cost: $9.45**

**Revenue:** $135 (180 min @ $0.75/min)
**Profit:** $125.55 (93% margin) ✅

---

## 🔧 Tools You Need

### Download Audio:
- **ytmp3.nu** (web-based, easiest)
- y2mate.com
- Any YouTube-to-MP3 converter

### Your Terminal:
- Already have `tsx` installed ✅
- Script is at `scripts/process-long-video.ts` ✅

---

## ❓ Common Issues

### "Document not found"
→ Video wasn't submitted through normal flow first
→ Submit via admin interface, then run manual script

### "AssemblyAI key not set"
→ Add ASSEMBLYAI_API_KEY to .env.local

### Script is slow
→ Normal! Takes 20-30% of audio duration
→ 3-hour video = 35-55 min processing time

---

## 📊 Expected Workload

### Per Month (at 5,000 min/month):
- Long videos: 3-5
- Your time: 1-2 hours
- Cost: $60-120 (your time + API)
- Revenue: $400-700
- Profit: $340-580 ✅

### Very Manageable!

---

## 🎯 Quick Reference

```bash
# Full workflow in one view:

# 1. Get video ID from alert email
VIDEO_ID=abc123

# 2. Download from ytmp3.nu → ~/Downloads/meeting.mp3

# 3. Process
cd ~/ackindex
tsx scripts/process-long-video.ts $VIDEO_ID ~/Downloads/meeting.mp3

# 4. Clean up
rm ~/Downloads/meeting.mp3

# Done! Takes 15-20 minutes total
```

---

## 📖 Full Documentation

See `LONG_VIDEO_WORKFLOW.md` for complete details, troubleshooting, and scaling considerations.

---

## ✅ You're Ready!

Next time you get a long video alert:
1. Download MP3 (5 min)
2. Run script (10 min)
3. Profit! ($100+ per video)

**Simple, profitable, scalable** 🚀
