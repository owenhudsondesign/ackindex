# Use official Node.js 20 on Debian Bookworm (has Python 3.11)
FROM node:20-bookworm-slim

# Install ffmpeg, Python 3.11, and dependencies for yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip (requires Python 3.10+)
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

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
