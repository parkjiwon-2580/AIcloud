# Ai클라우드

프로젝트명: Ai클라우드

한글 표기: 아이클라우드

## 프로젝트 한 줄 소개

Ai클라우드는 영유아 보호자가 아이의 증상, 나이, 성별 등을 입력하면 AI가 문진 내용을 분석하고, 진료 방향을 안내하며, 위치 기반으로 주변 소아과를 추천하는 하이브리드 클라우드 플랫폼입니다.

## 프로젝트 목적

- EKS 기반 MSA 구조 설계 및 운영
- AI 기반 영유아 문진 분석 기능 구현
- 위치 기반 소아과 추천 기능 구현
- 민감정보 분리 저장을 통한 하이브리드 아키텍처 구현
- Terraform 기반 AWS 인프라 코드화
- GitHub Actions 및 ArgoCD 기반 CI/CD 확장
- CloudWatch, Prometheus, Grafana 기반 모니터링 확장

## 서비스 대상과 문제 정의

서비스 대상은 영유아 보호자입니다.

영유아는 스스로 증상을 설명하기 어렵고, 보호자는 병원 방문 시 증상을 빠짐없이 전달하기 어렵습니다. 또한 야간이나 휴일에는 적절한 병원 선택이 어렵습니다.

Ai클라우드는 보호자가 문진을 통해 아이의 증상을 정리하고, AI가 증상 요약, 위험도, 추천 진료과를 제공하며, 병원 추천 페이지에서 주변 소아과 정보를 확인할 수 있도록 돕습니다.

실명, 전화번호, 아이 이름, 문진 원문 같은 민감정보는 AWS RDS에 저장하지 않고 On-Prem Sensitive API로 전달해 암호화 저장하는 방향으로 설계합니다.

## 주요 기능

1. 회원가입 / 로그인
   - 이메일 기반 회원가입
   - JWT 인증
   - 닉네임
   - 아이 정보 등록
   - 비밀번호 찾기는 MVP에서 제외하고 추후 기능으로 관리

2. 아이 정보 관리
   - 회원은 아이 정보를 등록할 수 있음
   - 아이별 진료 내역 조회
   - 아이 이름, 생년월일 등 민감정보는 On-Prem 영역에 저장

3. AI 문진
   - 아이 선택
   - 나이 또는 개월 수
   - 성별
   - 주요 증상 입력
   - AI 분석 요청
   - 결과는 의료진 진료 전 참고용으로 제공

4. AI 분석 결과
   - 증상 요약
   - 위험도
   - 추천 진료과
   - 진료 전 참고 안내
   - PDF 생성
   - PDF는 S3에 저장하고, RDS에는 `s3_key` 같은 metadata만 저장

5. 병원 추천
   - 문진 결과와 병원 추천은 분리
   - 문진 결과에서는 어느 과로 가면 좋을지 정도만 안내
   - 병원 추천 페이지에서는 병원명, 거리, 운영시간 등을 제공
   - Kakao API 또는 mock 데이터 사용 가능

6. 정보공유 / 게시판
   - 게시판 또는 관리자 기반 정보 제공 페이지로 확장 가능
   - 초기에는 정보공유 페이지 또는 `board-service` 폴더만 준비

7. 관리자 페이지
   - 추후 관리자 기능 확장 가능
   - 정보공유 글 관리, 사용자 관리, 게시글 관리 등을 고려

## 전체 아키텍처 요약

이 레포는 monorepo 구조입니다. EKS 기반 서비스는 GitHub Actions, ECR, ArgoCD를 통해 CI/CD를 적용할 예정이며, On-Prem Sensitive API는 EKS Pod가 아니라 On-Prem Role VPC의 Private Subnet EC2에서 실행되는 FastAPI 서비스로 관리합니다.

EKS 서비스는 사용자 인증, 문진, 정보공유, AI 분석, 병원 추천 기능을 담당합니다. On-Prem Sensitive API는 민감정보를 수신하고 필드 단위 암호화 후 On-Prem PostgreSQL에 저장합니다.

AWS Managed Services는 RDS PostgreSQL, SQS/DLQ, S3 reports bucket, CloudFront, ECR, CloudWatch, Bedrock, Secrets Manager 사용을 전제로 합니다.

Hybrid Network는 AWS Service VPC와 On-Prem Role VPC를 VGW, Customer Gateway, Site-to-Site VPN, strongSwan EC2로 연결하는 방향입니다. 주요 민감정보 흐름은 `EKS Pod -> VPN -> On-Prem FastAPI -> On-Prem PostgreSQL`입니다.

VPC, Subnet, IGW, Route Table은 콘솔에서 고정 관리하고, Terraform 코드는 추후 `infra/` 아래에 작성할 예정입니다.

## 레포 구조

```text
aicloud/
├── .github/
│   └── workflows/
│       └── .gitkeep
├── apps/
│   ├── frontend/
│   │   └── .gitkeep
│   ├── auth-user-service/
│   │   └── .gitkeep
│   ├── questionnaire-service/
│   │   └── .gitkeep
│   ├── board-service/
│   │   └── .gitkeep
│   ├── ai-triage-service/
│   │   └── .gitkeep
│   ├── hospital-recommendation-service/
│   │   └── .gitkeep
│   └── onprem-sensitive-api/
│       └── .gitkeep
├── packages/
│   ├── shared-types/
│   │   └── .gitkeep
│   ├── shared-config/
│   │   └── .gitkeep
│   ├── shared-utils/
│   │   └── .gitkeep
│   └── database/
│       └── .gitkeep
├── infra/
│   └── .gitkeep
├── manifests/
│   ├── base/
│   │   ├── auth-user-service/
│   │   │   └── .gitkeep
│   │   ├── questionnaire-service/
│   │   │   └── .gitkeep
│   │   ├── board-service/
│   │   │   └── .gitkeep
│   │   ├── ai-triage-service/
│   │   │   └── .gitkeep
│   │   └── hospital-recommendation-service/
│   │       └── .gitkeep
│   └── overlays/
│       ├── dev/
│       │   └── .gitkeep
│       └── prod/
│           └── .gitkeep
├── argocd-apps/
│   └── .gitkeep
├── docs/
│   └── README.md
├── scripts/
│   ├── local/
│   │   └── .gitkeep
│   ├── deploy/
│   │   └── .gitkeep
│   └── db/
│       └── .gitkeep
├── README.md
├── .gitignore
└── .env.example
```

## 디렉터리 역할

- `apps/`: 프론트엔드와 서비스 코드가 들어갈 위치입니다.
- `packages/`: 공통 타입, 설정, 유틸, DB schema가 들어갈 위치입니다.
- `infra/`: Terraform 코드가 들어갈 위치지만 현재는 비어 있습니다.
- `manifests/`: EKS 서비스용 Kubernetes manifest가 들어갈 위치입니다.
- `argocd-apps/`: EKS 서비스용 ArgoCD Application manifest가 들어갈 위치입니다.
- `docs/`: 프로젝트 문서가 들어갈 위치입니다.
- `scripts/`: 로컬 개발, 배포 보조, DB 작업 스크립트가 들어갈 위치입니다.

## 서비스 구성

### EKS 기반 서비스

- `auth-user-service`: 인증, 사용자 관리, JWT 발급과 검증
- `questionnaire-service`: 문진 입력, 문진 데이터 관리, AI 분석 요청 준비
- `board-service`: 정보공유 또는 게시판 기능
- `ai-triage-service`: Bedrock 기반 AI 문진 분석, 위험도 판단 보조, PDF 생성 흐름 연계
- `hospital-recommendation-service`: 위치 기반 소아과 추천, Kakao API 또는 mock 데이터 연계

### On-Prem 서비스

- `onprem-sensitive-api`: 민감정보 처리를 담당하는 FastAPI 서비스

`onprem-sensitive-api`는 EKS 서비스가 아니라 On-Prem EC2에서 실행됩니다. 이 서비스는 EKS Pod로 배포하지 않으며, ArgoCD 배포 대상도 아닙니다. 초기에는 CI만 적용하고, 배포는 수동 또는 SSM 방식으로 관리합니다.

## EKS 서비스와 On-Prem 서비스 구분

EKS 서비스는 `manifests/`와 `argocd-apps/`의 GitOps 관리 대상입니다. 반면 `onprem-sensitive-api`는 On-Prem Role VPC의 Private Subnet EC2에서 실행되며, Kubernetes manifest와 ArgoCD Application 대상에서 제외합니다.

`manifests/`에는 EKS 서비스만 둡니다. `manifests/base/onprem-sensitive-api`는 만들지 않습니다. `argocd-apps/`도 EKS 서비스용 GitOps 대상이므로 `onprem-sensitive-api`를 넣지 않습니다.

## 데이터 저장 구조

AWS RDS에는 일반 데이터만 저장합니다.

예:

- `users`
- `refresh_tokens`
- `auth_verification_tokens`
- `consultations`
- `ai_results`
- `consultation_assets`
- `board_posts`
- `board_images`
- `hospital_recommendation_logs`

On-Prem PostgreSQL에는 민감정보를 저장합니다.

예:

- `sensitive_user_profiles`
- `sensitive_children`
- `sensitive_consultation_payloads`

AWS RDS에 저장하면 안 되는 값:

- 보호자 실명
- 전화번호
- 주소
- 아이 이름
- 아이 생년월일
- 문진 원문 전체
- 직접 식별 가능한 개인정보

SQS 메시지 원칙:

- SQS에는 개인정보를 넣지 않습니다.
- SQS에 넣어도 되는 값은 `consultation_id`, `user_id`, `created_at` 같은 식별자와 처리 기준 metadata입니다.
- SQS에 넣으면 안 되는 값은 실명, 전화번호, 주소, 아이 이름, 문진 원문, 개인정보입니다.

## AI 문진 및 PDF 저장 흐름

1. 보호자가 아이를 선택하고 증상, 나이 또는 개월 수, 성별, 주요 증상을 입력합니다.
2. 문진 원문과 직접 식별 가능한 민감정보는 On-Prem Sensitive API로 전달해 필드 단위 암호화 후 On-Prem PostgreSQL에 저장합니다.
3. AWS RDS에는 문진 식별자, 사용자 식별자, 분석 상태, 생성 시각 등 일반 metadata만 저장합니다.
4. AI 분석 요청은 개인정보를 제외한 식별자 중심 메시지로 SQS에 전달합니다.
5. `ai-triage-service`는 필요한 기준 데이터와 안전하게 참조 가능한 metadata를 바탕으로 Bedrock 분석 흐름을 수행합니다.
6. AI 분석 결과는 증상 요약, 위험도, 추천 진료과, 진료 전 참고 안내를 제공합니다.
7. PDF 산출물은 S3 reports bucket에 저장하고, AWS RDS에는 `s3_key` 같은 metadata만 저장합니다.

AI 문진 결과는 의료진 진료 전 참고용이며, 진단을 대체하지 않습니다.

## 인프라 관리 방향

VPC, Subnet, IGW, Route Table은 콘솔에서 고정 관리하는 방향입니다. Terraform은 추후 `infra/` 안에서 작성하며, 현재는 폴더만 준비되어 있습니다.

Kubernetes manifest, ArgoCD Application, Terraform 코드는 아직 작성하지 않았습니다.

## CI/CD 적용 범위

EKS 서비스는 CI/CD 적용 대상입니다.

EKS 서비스 배포 흐름:

```text
GitHub Actions
-> Docker build
-> ECR push
-> ArgoCD
-> EKS 배포
```

On-Prem Sensitive API는 CI만 적용합니다. 배포는 ArgoCD가 아니라 EC2 수동 배포 또는 SSM 방식으로 관리합니다.

현재 `.github/workflows/`에는 workflow 내용을 만들지 않았습니다.

## Git 브랜치 전략 요약

- `main`: 운영 배포 기준 브랜치
- `develop`: 개발 통합 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치
- `hotfix/*`: 긴급 수정 브랜치

세부 브랜치 전략과 PR 규칙은 추후 `docs/git-guide.md`에 정리할 예정입니다.

## 환경변수와 Secret 관리 원칙

실제 Secret은 Git에 올리지 않습니다. AWS Access Key, DB Password, JWT_SECRET, FIELD_ENCRYPTION_KEY, MAP_API_KEY, 인증서, kubeconfig, Terraform state와 tfvars 파일은 저장소에 커밋하지 않습니다.

`.env.example`은 환경변수 이름과 placeholder만 제공하며, `.env` 파일은 만들지 않습니다. 운영 Secret은 AWS Secrets Manager 등 별도 Secret 관리 도구를 사용합니다.

## GIthub Actions 모니터링 작업

# 상태 배지

![CI - ai-triage-service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-ai-triage-service.yml)/badge.svg)
![CI - Auth User Service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-auth-user-service.yml)/badge.svg)
![CI - Board Service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-board-service.yml)/badge.svg)
![CI - Frontend Service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-frontend.yml)/badge.svg)
![CI - Frontend Service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-hospital-recommendation-service.yml)/badge.svg)
![CI - onprem-sensitive-api](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-onprem-sensitive-api.yml)/badge.svg)
![CI - questionnaire-service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-questionnaire-service.yml)/badge.svg)
[![CI - ai-triage-service](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-ai-triage-service.yml/badge.svg)](https://github.com/parkjiwon-2580/AIcloud/actions/workflows/ci-ai-triage-service.yml)

