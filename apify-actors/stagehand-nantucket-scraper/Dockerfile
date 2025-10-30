# Use plain Apify Node.js 20 image (let Stagehand manage its own Playwright)
FROM apify/actor-node:20

# Install system dependencies for Playwright (Alpine Linux)
RUN apk add --no-cache \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    chromium

# Copy package files
COPY package*.json ./

# Install dependencies (Stagehand will bring its own Playwright)
RUN npm install --production

# Set environment variable to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy source code
COPY . ./

# Run the actor
CMD npm start

