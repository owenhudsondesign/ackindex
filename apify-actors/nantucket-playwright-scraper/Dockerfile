FROM apify/actor-python-playwright:3.11

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy the rest of the files
COPY . ./

CMD ["python", "main.py"]
