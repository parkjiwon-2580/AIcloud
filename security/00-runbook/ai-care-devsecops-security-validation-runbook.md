# AI Care 플랫폼 위협 시나리오 기반 DevSecOps 보안 검증 런북

## 0. 목적

AI Care 플랫폼을 대상으로 위협 시나리오 기반 DevSecOps 보안 검증을 수행한다.

본 런북은 다음을 목표로 한다.

- Before Baseline 기준을 고정한다.
- 보안 도구를 사용해 Scenario별 위험을 확인한다.
- 실제 위험, 오탐, 테스트 값, 추가 확인 필요 항목을 분류한다.
- 승인된 범위에서만 개선을 수행한다.
- 동일 조건으로 After 재검증을 수행한다.
- 발표 및 보고서에 사용할 증거를 남긴다.

본 문서는 OWASP Top 10 전체 진단이 아니라, OWASP Top 10 연계 DevSecOps 보안 점검 절차로 작성한다.

## 1. 공통 원칙

- 첫 단계에서는 Read-only Baseline 점검만 수행한다.
- `terraform apply`, `terraform destroy`, AWS 리소스 변경, `kubectl apply`, Docker push, Secret rotate, 실제 배포는 수행하지 않는다.
- 실제 Secret 값은 터미널 캡처, 보고서, 공유 문서에 남기지 않는다.
- 도구가 설치되어 있지 않으면 무단 설치하지 않고, 설치 필요 여부를 기록한 뒤 승인 후 설치한다.
- 발견 결과는 다음으로 분류한다.
  - `Confirmed Secret`
  - `Potential Secret`
  - `False Positive`
  - `Test/Placeholder`
  - `확인 필요`
- 각 Scenario의 Before 점검이 끝나면 결과를 정리하고, 개선 작업 전 승인을 받는다.
- Scenario 4의 RDS, VPN, Security Group, `pg_hba.conf`, FastAPI 암호화 구조는 수정하지 않는다. 문제가 발견되면 변경하지 않고 보고만 한다.

## 2. 권장 디렉터리 구조

```text
security/
├── 00-runbook/
│   └── ai-care-devsecops-security-validation-runbook.md
├── 01-scope/
│   ├── baseline-context.md
│   └── existing-controls.md
├── 02-baseline/
│   ├── scenario-01-secrets/
│   ├── scenario-02-iac-aws/
│   ├── scenario-03-container-k8s/
│   └── scenario-04-sensitive-boundary/
├── 03-remediation/
├── 04-retest/
│   ├── scenario-01-secrets/
│   ├── scenario-02-iac-aws/
│   ├── scenario-03-container-k8s/
│   └── scenario-04-sensitive-boundary/
└── 05-evidence/
    ├── screenshots/
    └── command-logs/
```

## 3. 전체 진행 순서

1. Before 기준 고정
2. 도구 버전 확인
3. Scenario 1 Secret Baseline 실행
4. Scenario 2 Terraform IaC 및 AWS Read-only Baseline 실행
5. Scenario 3 Container 및 Kubernetes Baseline 실행
6. Scenario 4 기존 민감정보 경계 통제 증거 정리
7. Finding 분류 및 개선 범위 승인
8. 승인된 개선만 수행
9. After 재검증 실행
10. Before/After 비교 보고서 작성

## 4. Phase 0 - Before 기준 고정

작업자는 저장소 기준점을 먼저 고정한다.

```bash
git status
git rev-parse HEAD
git branch --show-current
date
```

기록 파일을 생성한다.

```bash
mkdir -p security/01-scope
```

`security/01-scope/baseline-context.md` 예시:

```text
# Baseline Context

- Baseline Commit:
- Branch:
- Date:
- Environment: dev
- Operator:
- Notes:
```

주의:

- `git status`에 의도하지 않은 변경이 있으면 Baseline 전에 정리 여부를 결정한다.
- Secret 원문이 포함될 수 있는 로그는 저장하지 않는다.

## 5. Phase 0 - 도구 버전 확인

작업자는 사용할 도구의 설치 여부와 버전을 기록한다.

```bash
gitleaks version
checkov --version
trivy --version
prowler --version
kubescape version
aws --version
kubectl version --client
```

도구가 없으면:

- `not installed`로 기록한다.
- 설치 방법을 확인한다.
- 팀 또는 담당자 승인 후 설치한다.

### 5.1 macOS Homebrew 설치 예시

macOS에서 Homebrew를 사용하는 경우 다음 명령으로 주요 점검 도구를 설치할 수 있다.

```bash
brew install gitleaks checkov trivy prowler kubescape
```

AWS CLI 또는 kubectl이 없는 경우에만 추가 설치한다.

```bash
brew install awscli kubectl
```

설치 후 버전을 다시 확인한다.

```bash
gitleaks version
checkov --version
trivy --version
prowler --version
kubescape version
aws --version
kubectl version --client
```

### 5.2 Windows PowerShell 설치 예시

Windows에서는 PowerShell을 기준으로 설치 및 버전 확인을 수행한다.

사전 확인:

```powershell
$PSVersionTable.PSVersion
winget --version
py --version
python --version
git --version
aws --version
kubectl version --client
```

`winget`이 없는 경우 Microsoft Store의 App Installer 또는 Windows Package Manager 설치 상태를 먼저 확인한다.

#### 5.2.1 AWS CLI 및 kubectl

AWS CLI 또는 kubectl이 없는 경우 설치한다.

```powershell
winget install -e --id Amazon.AWSCLI
winget install -e --id Kubernetes.kubectl
```

설치 후 새 PowerShell을 열고 확인한다.

```powershell
aws --version
kubectl version --client
```

#### 5.2.2 Python 기반 도구

Checkov와 Prowler는 Python 기반 설치를 사용한다. Prowler 호환성을 고려해 Python 3.10~3.12 사용을 권장한다.

```powershell
py -3.12 --version
py -3.12 -m pip install --upgrade pip
py -3.12 -m pip install --user pipx
py -3.12 -m pipx ensurepath
```

새 PowerShell을 연 뒤 설치한다.

```powershell
pipx install checkov
pipx install prowler
```

설치 후 확인한다.

```powershell
checkov --version
prowler --version
```

`pipx` 명령이 인식되지 않으면 사용자 PATH가 갱신되지 않은 상태일 수 있으므로 PowerShell을 다시 열거나 다음 명령으로 확인한다.

```powershell
py -3.12 -m pipx list
```

#### 5.2.3 Gitleaks

Gitleaks는 공식 GitHub Releases에서 Windows용 zip 파일을 내려받아 설치한다.

절차:

1. https://github.com/gitleaks/gitleaks/releases 에서 최신 stable release를 확인한다.
2. `gitleaks_<version>_windows_x64.zip` 파일을 내려받는다.
3. 압축을 해제한다.
4. `gitleaks.exe`가 있는 폴더를 사용자 PATH에 추가한다.
5. 새 PowerShell에서 버전을 확인한다.

```powershell
gitleaks version
```

Docker Desktop을 사용하는 경우에는 공식 컨테이너 이미지 방식도 사용할 수 있다.

```powershell
docker pull ghcr.io/gitleaks/gitleaks:latest
```

#### 5.2.4 Trivy

Trivy는 공식 GitHub Releases에서 Windows용 zip 파일을 내려받아 설치한다.

절차:

1. https://github.com/aquasecurity/trivy/releases 에서 최신 stable release를 확인한다.
2. `trivy_<version>_windows-64bit.zip` 파일을 내려받는다.
3. 압축을 해제한다.
4. `trivy.exe`가 있는 폴더를 사용자 PATH에 추가한다.
5. 새 PowerShell에서 버전을 확인한다.

```powershell
trivy --version
```

Docker Desktop을 사용하는 경우에는 공식 컨테이너 이미지 방식도 사용할 수 있다.

```powershell
docker pull aquasec/trivy:latest
```

#### 5.2.5 Kubescape

Kubescape는 Windows x64를 지원한다. PowerShell 설치 스크립트를 사용할 수 있다.

```powershell
iwr -useb https://raw.githubusercontent.com/kubescape/kubescape/master/install.ps1 | iex
```

실행 정책 오류가 발생하면 사용자 범위에서 실행 정책을 조정한 뒤 다시 실행한다.

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Scoop 또는 Chocolatey를 사용하는 경우 다음 방식도 가능하다. 단, 패키지 최신성은 각 커뮤니티 패키지 상태를 확인한다.

```powershell
scoop install kubescape
choco install kubescape
```

설치 후 확인한다.

```powershell
kubescape version
```

#### 5.2.6 Windows 설치 후 전체 버전 확인

모든 설치가 끝나면 새 PowerShell에서 다음을 실행하고 결과를 `security/01-scope/baseline-context.md` 또는 별도 증거 파일에 기록한다.

```powershell
gitleaks version
checkov --version
trivy --version
prowler --version
kubescape version
aws --version
kubectl version --client
```

## 6. Scenario 1 - GitHub Secret 유출 위험 Baseline

### 6.1 위협 시나리오

DB Password, JWT Secret, AWS Credential, API Key, `DATABASE_URL`, `FIELD_ENCRYPTION_KEY` 같은 값이 Repository 또는 Git History에 포함되면 인증 우회, DB 무단 접근, 외부 API 오남용으로 이어질 수 있다.

### 6.2 점검 대상

- 현재 Git tracked files
- Git commit history
- `.env`, `.env.*`
- `application.yml`, `application.yaml`
- Terraform tfvars, variables, state 관련 파일
- Kubernetes Secret YAML
- GitHub Actions Workflow
- Docker Compose
- 문서, 실행 스크립트, 로그, 샘플 설정 파일

### 6.3 Before 실행 - Current Git tracked files 기준

Scenario 1의 공식 Current Baseline은 작업 디렉터리 전체가 아니라 현재 Baseline Commit의 Git tracked files만 대상으로 한다.

포함:

- 현재 Baseline Commit에 포함된 Git tracked files

제외:

- `.gitignore` 또는 `.git/info/exclude`로 제외된 파일
- `.local/` 등 개인 로컬 파일
- untracked 보안 산출물
- Git stash
- 다른 브랜치 및 과거 Git history

```bash
mkdir -p security/02-baseline/scenario-01-secrets

gitleaks version
```

Git tracked files만 임시 디렉터리로 추출한다.

```bash
REPO_ROOT="$(pwd)"
SCAN_DIR="$(mktemp -d)"

git archive HEAD | tar -x -C "$SCAN_DIR"
```

임시 디렉터리에서 Gitleaks를 실행한다.

```bash
(
  cd "$SCAN_DIR"
  gitleaks dir . \
    --redact \
    --report-format json \
    --report-path "$REPO_ROOT/security/02-baseline/scenario-01-secrets/gitleaks-current-tracked-before.json"
)
```

요약 파일을 생성한다.

```bash
jq -r '.[] | [.RuleID, .File, (.StartLine|tostring)] | @tsv' \
  security/02-baseline/scenario-01-secrets/gitleaks-current-tracked-before.json \
  > security/02-baseline/scenario-01-secrets/gitleaks-current-tracked-before-summary.tsv
```

임시 디렉터리를 삭제한다.

```bash
rm -rf "$SCAN_DIR"
```

보조 확인:

```bash
git ls-files > security/02-baseline/scenario-01-secrets/git-ls-files-before.txt
```

주의:

- `gitleaks-current-tracked-before.json`이 redacted 상태인지 확인한다.
- Secret 원문이 보이는 결과는 보고서나 공유 문서에 포함하지 않는다.
- 삭제, rotate, Git history rewrite는 승인 전 수행하지 않는다.
- Git history 유출 여부는 별도 확장 점검으로 분리한다.

### 6.4 결과 정리 기준

| 분류 | 판단 기준 |
| --- | --- |
| Confirmed Secret | 실제 운영 또는 검증 환경에서 사용 가능한 Secret으로 판단되는 값 |
| Potential Secret | Secret일 가능성이 있으나 사용 여부, 만료 여부, 환경 확인이 필요한 값 |
| False Positive | Secret 값이 아니라 키 이름, 환경변수 참조, ARN, 문서상 예시 등으로 판단되는 항목 |
| Test/Placeholder | `example`, `changeme`, `dummy`, `localhost`, `dev-only` 등 테스트 또는 예제 값 |
| 확인 필요 | 값의 성격을 현 시점에서 판단하기 어려운 항목 |

### 6.5 산출물

```text
security/02-baseline/scenario-01-secrets/
├── gitleaks-current-tracked-before.json
├── gitleaks-current-tracked-before-summary.tsv
├── git-ls-files-before.txt
├── baseline-summary.md
├── findings.csv
├── false-positives.md
└── remediation-plan.md
```

### 6.6 중단 지점

Scenario 1 Before 결과 정리 후 중단하고 개선 범위 승인을 받는다.

## 7. Scenario 2 - Terraform IaC 및 AWS 환경 Baseline

### 7.1 위협 시나리오

Terraform 또는 실제 AWS 환경에 과도한 공개 접근, 과도한 IAM 권한, 암호화 미적용, 로깅 미흡, 보안 그룹 오픈 등 설정 위험이 있으면 데이터 유출과 권한 상승으로 이어질 수 있다.

### 7.2 점검 대상

- `infra/terraform/`
- Terraform modules, environments, variables, outputs
- AWS dev 계정의 read-only 보안 상태
- IAM, S3, RDS, EKS, VPC, Security Group, CloudTrail, KMS, Secrets Manager, ECR 등

### 7.3 Terraform IaC Before 실행

```bash
mkdir -p security/02-baseline/scenario-02-iac-aws

checkov --version

checkov -d infra/terraform -o json \
  > security/02-baseline/scenario-02-iac-aws/checkov-before.json
```

주의:

- Baseline 단계에서 `terraform init`, `terraform plan`, `terraform apply`를 수행하지 않는다.
- Checkov 결과에 민감 값이 포함되어 보이면 보고서에 원문을 남기지 않는다.

### 7.4 AWS Read-only Before 실행

AWS 계정, 프로필, 리전을 직접 확인한다.

```bash
aws sts get-caller-identity --profile <AWS_PROFILE>
aws configure get region --profile <AWS_PROFILE>

prowler --version

prowler aws \
  -p <AWS_PROFILE> \
  -M csv json-ocsf html \
  -o security/02-baseline/scenario-02-iac-aws/prowler-before
```

주의:

- AWS Access Key, Secret Access Key, Session Token을 보고서에 남기지 않는다.
- Prowler 실행 전 대상 계정이 dev 환경인지 확인한다.
- 리소스 변경 명령은 실행하지 않는다.

### 7.5 결과 정리 기준

- 인터넷 공개 리소스 여부
- 암호화 적용 여부
- 로깅 및 모니터링 적용 여부
- 최소 권한 원칙 위반 여부
- 보안 그룹 인바운드/아웃바운드 범위
- 실제 운영 영향도
- IaC와 실제 AWS 상태의 불일치 여부

### 7.6 산출물

```text
security/02-baseline/scenario-02-iac-aws/
├── checkov-before.json
├── prowler-before/
├── baseline-summary.md
├── findings.csv
├── false-positives.md
└── remediation-plan.md
```

### 7.7 중단 지점

Checkov/Prowler Before 결과 정리 후 중단하고 개선 범위 승인을 받는다.

## 8. Scenario 3 - Container 및 Kubernetes Baseline

### 8.1 위협 시나리오

취약한 컨테이너 이미지, root 실행, 과도한 권한, 잘못된 Kubernetes manifest, 이미지 태그 불명확성, 취약한 base image는 컨테이너 탈출, 권한 상승, 서비스 침해로 이어질 수 있다.

### 8.2 점검 대상

- 실제 배포된 동일 이미지 태그 또는 digest
- 각 서비스 Dockerfile
- `manifests/` Kubernetes YAML
- GitHub Actions build/deploy workflow
- ECR 이미지, 로컬 이미지 또는 배포 이미지 참조

### 8.3 배포 이미지 기준 확인

조회 명령만 수행한다.

```bash
mkdir -p security/02-baseline/scenario-03-container-k8s

kubectl get deploy -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{" "}{range .spec.template.spec.containers[*]}{.image}{" "}{end}{"\n"}{end}' \
  > security/02-baseline/scenario-03-container-k8s/deployed-images-before.txt
```

주의:

- 실제 배포된 이미지 태그 또는 digest를 기준으로 Trivy를 실행한다.
- `latest`처럼 불명확한 태그는 Finding 후보로 기록한다.

### 8.4 Trivy 이미지 Before 실행

서비스별로 실행한다.

```bash
trivy --version

trivy image \
  --severity HIGH,CRITICAL \
  --format json \
  --output security/02-baseline/scenario-03-container-k8s/<service-name>-trivy-before.json \
  <IMAGE>:<TAG>
```

반복 대상 예시:

```text
auth-user-service
board-service
questionnaire-service
ai-triage-service
hospital-recommendation-service
frontend
onprem-sensitive-api
```

### 8.5 Kubernetes Manifest Before 실행

```bash
kubescape version

kubescape scan manifests/ \
  --format json \
  --format-version v2 \
  --output security/02-baseline/scenario-03-container-k8s/kubescape-manifests-before.json
```

주의:

- `kubescape fix`, `kubectl apply`, 이미지 patch/push는 수행하지 않는다.
- Registry credential, kubeconfig, Secret 값은 보고서에 남기지 않는다.

### 8.6 결과 정리 기준

- Critical/High CVE 여부
- Fix version 존재 여부
- 실제 실행 이미지에 포함된 취약점인지 여부
- Base image 교체 필요 여부
- Root 실행 여부
- Privileged 권한, hostPath, hostNetwork, hostPID 사용 여부
- Resource limits 설정 여부
- ServiceAccount와 RBAC 범위

### 8.7 산출물

```text
security/02-baseline/scenario-03-container-k8s/
├── deployed-images-before.txt
├── <service-name>-trivy-before.json
├── kubescape-manifests-before.json
├── baseline-summary.md
├── findings.csv
├── false-positives.md
└── remediation-plan.md
```

### 8.8 중단 지점

Trivy/Kubescape Before 결과 정리 후 중단하고 개선 범위 승인을 받는다.

## 9. Scenario 4 - RDS/On-Prem 민감정보 경계 검증

### 9.1 현재 통제 상태

Scenario 4는 이미 구현 및 검증된 통제로 취급한다. 다음 구조는 수정하지 않는다.

- 일반 데이터는 Cloud RDS 저장
- 민감정보는 FastAPI를 통해 On-Prem PostgreSQL에 저장
- 민감정보는 Fernet 암호화 후 `*_enc`, `raw_enc` 컬럼에 저장
- 관리 접근은 SSM 사용
- EKS Pod에서 FastAPI `/health`, `/db-health` 통신 검증 완료

### 9.2 점검 목적

민감정보가 Cloud RDS로 흘러가지 않고, On-Prem PostgreSQL 경계와 FastAPI 암호화 구조가 유지되는지 증거를 수집한다.

### 9.3 기존 통제 문서 작성

```text
security/01-scope/existing-controls.md
```

포함 내용:

- 데이터 분류
- Cloud RDS 저장 범위
- On-Prem PostgreSQL 저장 범위
- FastAPI 암호화 방식
- 관리 접근 방식
- EKS Pod 통신 검증 결과
- 변경 금지 항목

### 9.4 Read-only 코드 및 설정 확인

Secret 값이 아니라 구조 키워드만 확인한다.

```bash
mkdir -p security/02-baseline/scenario-04-sensitive-boundary

rg -n "Fernet|FIELD_ENCRYPTION_KEY|_enc|raw_enc|/health|/db-health" \
  apps/onprem-sensitive-api apps/*/src \
  > security/02-baseline/scenario-04-sensitive-boundary/code-structure-before.txt

git ls-files | rg "onprem|rds|vpn|security|pg_hba|sensitive|fastapi" \
  > security/02-baseline/scenario-04-sensitive-boundary/relevant-files-before.txt
```

주의:

- `FIELD_ENCRYPTION_KEY` 값은 출력하지 않는다.
- DB 원문 민감정보 조회 쿼리는 실행하지 않는다.

### 9.5 Runtime Health 증거 수집

이미 검증 완료된 항목이면 기존 증거를 첨부한다. 재확인이 필요할 때만 조회 명령을 실행한다.

```bash
kubectl get pods -A
kubectl get svc -A
```

Pod 내부 통신 재확인은 승인 후에만 수행한다.

```bash
kubectl exec -n <namespace> <pod-name> -- \
  curl -fsS http://<onprem-sensitive-api-service>:<port>/health

kubectl exec -n <namespace> <pod-name> -- \
  curl -fsS http://<onprem-sensitive-api-service>:<port>/db-health
```

주의:

- 응답에 Secret, DB 접속 문자열, 암호화 키가 포함되면 저장하거나 공유하지 않는다.
- RDS, VPN, Security Group, `pg_hba.conf`, FastAPI 암호화 코드는 수정하지 않는다.

### 9.6 산출물

```text
security/02-baseline/scenario-04-sensitive-boundary/
├── code-structure-before.txt
├── relevant-files-before.txt
├── baseline-summary.md
├── findings.csv
├── false-positives.md
└── remediation-plan.md
```

### 9.7 중단 지점

기존 통제 증거 정리 후 중단한다. 문제가 발견되어도 즉시 수정하지 않고 보고만 한다.

## 10. Remediation 승인 방식

Before 결과 정리 후, 수정 범위를 명시적으로 승인한다.

```text
다음 Finding만 수정 승인합니다.

- S1-001:
- S2-003:
- S3-002:

허용:
- 문서 수정
- .gitignore 보완
- CI scan 추가
- manifest 보안 설정 보완

금지:
- Secret rotate
- Git history rewrite
- Terraform apply/destroy
- AWS 리소스 변경
- kubectl apply
- Docker push
- Scenario 4 기존 통제 구조 수정
```

수정 후에는 다음을 확인한다.

```bash
git diff
git status
```

## 11. After 재검증

수정 후 동일 도구, 동일 버전, 동일 옵션, 동일 대상을 기준으로 재스캔한다.

### 11.1 Scenario 1

```bash
mkdir -p security/04-retest/scenario-01-secrets

REPO_ROOT="$(pwd)"
SCAN_DIR="$(mktemp -d)"

git archive HEAD | tar -x -C "$SCAN_DIR"

(
  cd "$SCAN_DIR"
  gitleaks dir . \
    --redact \
    --report-format json \
    --report-path "$REPO_ROOT/security/04-retest/scenario-01-secrets/gitleaks-current-tracked-after.json"
)

rm -rf "$SCAN_DIR"
```

### 11.2 Scenario 2

```bash
mkdir -p security/04-retest/scenario-02-iac-aws

checkov -d infra/terraform -o json \
  > security/04-retest/scenario-02-iac-aws/checkov-after.json

prowler aws \
  -p <AWS_PROFILE> \
  -M csv json-ocsf html \
  -o security/04-retest/scenario-02-iac-aws/prowler-after
```

### 11.3 Scenario 3

```bash
mkdir -p security/04-retest/scenario-03-container-k8s

trivy image \
  --severity HIGH,CRITICAL \
  --format json \
  --output security/04-retest/scenario-03-container-k8s/<service-name>-trivy-after.json \
  <IMAGE>:<TAG>

kubescape scan manifests/ \
  --format json \
  --format-version v2 \
  --output security/04-retest/scenario-03-container-k8s/kubescape-manifests-after.json
```

### 11.4 Scenario 4

Scenario 4는 변경 금지 통제이므로 After는 다음 중 하나로 처리한다.

- 변경이 없으면 "기존 통제 유지"로 재확인한다.
- 관련 코드/인프라 변경이 있었다면 read-only 증거만 다시 수집한다.
- 구조 변경이나 rotate가 필요하면 별도 승인 시나리오로 분리한다.

## 12. Before/After 보고서 템플릿

```text
# Scenario N - Before/After Summary

## Scope

- Commit Before:
- Commit After:
- Branch:
- Environment:
- Tool:
- Tool Version:
- Command Before:
- Command After:

## Before Summary

- Critical:
- High:
- Medium:
- Low:
- Info:

## Approved Remediation

- Finding ID:
- Change:
- Reason:
- Risk:

## After Summary

- Critical:
- High:
- Medium:
- Low:
- Info:

## Result

- Resolved Findings:
- Remaining Findings:
- False Positives:
- Accepted Risks:
- Follow-up:
```

## 13. 발표용 증거 체크리스트

각 Scenario마다 최소 4개를 남긴다.

- 도구 버전 화면 또는 로그
- Before 실행 명령과 결과 요약
- 승인된 수정 diff 또는 변경 없음 근거
- After 동일 조건 재실행 결과

권장 발표 흐름:

```text
Before 취약점 결과
-> 승인된 개선 조치
-> After 동일 도구 재점검
-> 해결된 위험과 잔여 위험
```

## 14. 참고 문서

- Gitleaks: https://github.com/gitleaks/gitleaks
- Checkov CLI: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Prowler CLI: https://docs.prowler.com/getting-started/basic-usage/prowler-cli
- Prowler Reporting: https://docs.prowler.com/user-guide/cli/tutorials/reporting
- Trivy image scan: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Kubescape scan: https://kubescape.io/docs/scanning/
