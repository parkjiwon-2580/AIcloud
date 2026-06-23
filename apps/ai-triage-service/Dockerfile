FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl font-unifont font-noto-cjk

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl font-unifont font-noto-cjk

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3003

USER node

CMD ["node", "dist/main.js"]
