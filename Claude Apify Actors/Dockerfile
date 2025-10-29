# Dockerfile for Nantucket PDF Scraper Apify Actor
FROM apify/actor-python:3.11

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy source code
COPY . ./

# Run the Actor
CMD ["python", "main.py"]
