FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl font-unifont font-noto-cjk

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3003

CMD ["node", "dist/main.js"]
