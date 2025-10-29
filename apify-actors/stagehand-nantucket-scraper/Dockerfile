# Use Apify's Node.js base image (without pre-installed Playwright)
FROM apify/actor-node:20

# Install system dependencies for Playwright (Alpine Linux uses apk)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    xvfb-run \
    xvfb \
    dbus \
    font-noto-emoji

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy source code
COPY . ./

# Start the actor with xvfb
CMD xvfb-run -a npm start --silent

