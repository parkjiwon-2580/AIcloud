# 1단계: Node.js 환경에서 프론트엔드 코드 빌드 (우리가 아까 CI에서 맞춘 24버전 기준)
FROM node:24-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 먼저 복사 후 설치 (캐시 최적화)
COPY package.json package-lock.json ./
RUN npm ci

# 나머지 전체 코드 복사 및 빌드
COPY . .
RUN npm run build

# 2단계: 가볍고 빠른 Nginx 웹 서버를 통해 빌드된 정적 파일 서빙
FROM nginxinc/nginx-unprivileged:alpine

# Nginx의 기본 웹 호스팅 디렉토리로 빌드 결과물 복사
# 🚨 주의: Vite는 'dist', Create React App은 'build' 폴더를 생성합니다. 
# 프로젝트에 맞게 아래 경로의 /app/dist 부분을 /app/build 등으로 수정할 수 있습니다.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 컨테이너는 non-root 포트로 실행하고, Kubernetes Service에서 80 -> 8080으로 라우팅합니다.
EXPOSE 8080

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
