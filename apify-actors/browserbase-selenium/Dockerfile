FROM apify/actor-node:20

RUN apt-get update && apt-get install -y chromium-driver chromium && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --quiet || npm install --omit=dev --quiet

COPY . ./

CMD ["npm", "start", "--silent"]


