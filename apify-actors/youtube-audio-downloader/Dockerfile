# Use official Node.js 20 on Debian
FROM node:20-bullseye-slim

# Install ffmpeg, yt-dlp for robust YouTube downloading
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (more reliable than ytdl-core, bypasses bot detection)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy source code
COPY . ./

# Run the actor
CMD ["npm", "start"]
