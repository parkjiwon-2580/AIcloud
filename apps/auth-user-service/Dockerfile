FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/aicare npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
