FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

RUN corepack enable

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY web ./web
COPY agent ./agent
COPY data/ashby-boards.seed.json ./seed/ashby-boards.seed.json
COPY docs ./docs

RUN npm run build \
  && mkdir -p /app/data/uploads /app/data/screenshots /app/seed

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]
