FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts

USER app
EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "--import", "tsx", "server/index.ts"]
