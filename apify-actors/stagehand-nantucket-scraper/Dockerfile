# Use official Node.js 20 on Debian (Playwright needs glibc, not available on Alpine)
FROM node:20-bullseye-slim

# Install Apify SDK and required system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Install Playwright's Chromium browser
RUN npx playwright install chromium --with-deps

# Copy source code
COPY . ./

# Run with xvfb for headless Chrome
CMD ["xvfb-run", "-a", "-s", "-ac -screen 0 1920x1080x24+32 -nolisten tcp", "npm", "start"]

