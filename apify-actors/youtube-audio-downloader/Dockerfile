# Use official Node.js 20 on Debian
FROM node:20-bullseye-slim

# Install ffmpeg (required by ytdl-core for audio extraction)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    && rm -rf /var/lib/apt/lists/*

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
