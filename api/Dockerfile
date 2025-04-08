FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
  openssl \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start:prod"]
