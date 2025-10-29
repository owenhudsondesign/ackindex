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

# Install Playwright browsers (skip system deps since we already installed them)
RUN npx playwright install chromium

# Set environment for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

# Copy source code
COPY . ./

# Start the actor with xvfb
CMD xvfb-run -a npm start --silent

