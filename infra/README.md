# AI Care Infra

Infra-only Terraform for the AI-based hybrid infant pre-questionnaire and
hospital recommendation platform.

This folder creates AWS infrastructure only. It does not modify application
code, Kubernetes manifests, GitHub Actions workflows, `docker-compose.yml`, or
root environment examples.

## Network Management Baseline

VPC, subnet, Internet Gateway, and route table resources are console-managed and
kept fixed. Terraform receives their IDs as inputs and references them through
data sources only.

Console-managed network resources:

- Service VPC
- Service public subnets A/C
- Service private app subnets A/C
- Service private data subnets A/C
- Service VPC Internet Gateway
- Service public route tables
- Service private app route tables
- Service private data route tables
- On-Prem VPC
- On-Prem public subnet
- On-Prem private subnet
- On-Prem VPC Internet Gateway
- On-Prem public route table
- On-Prem private route table

Terraform-managed resources:

- Service NAT Gateway and NAT EIP
- Security groups
- strongSwan EC2 and EIP
- FastAPI placeholder EC2
- On-Prem PostgreSQL placeholder EC2
- Virtual Private Gateway, Customer Gateway, Site-to-Site VPN, and VPN routes
- RDS PostgreSQL with AWS-managed master password
- EKS cluster, managed node group, OIDC provider, and add-ons
- ECR repositories
- SQS triage queue and DLQ
- S3 reports bucket and CloudFront distribution
- CloudWatch log groups
- Backend IRSA role and policies
- AI processor placeholder IAM role and policy

## Routing Baseline

- Service public route tables have console-managed
  `0.0.0.0/0 -> Service VPC IGW`.
- Service private app route tables receive Terraform-managed
  `0.0.0.0/0 -> Service NAT Gateway`.
- Service private app route tables receive Terraform-managed
  `172.16.0.0/16 -> VGW`.
- Service private app route tables must not route `0.0.0.0/0` to an IGW.
- On-Prem public route table has console-managed
  `0.0.0.0/0 -> On-Prem VPC IGW`.
- On-Prem private route table receives Terraform-managed
  `10.0.0.0/16 -> strongSwan ENI`.
- Service VPC IGW and On-Prem VPC IGW are separate resources and must not be
  mixed.

## Not Created by Terraform

- Existing Service VPC, subnets, IGW, or route tables
- Existing On-Prem VPC, subnets, IGW, or route tables
- Service public route table default route to the Service IGW
- On-Prem public route table default route to the On-Prem IGW
- ALB
- AWS Load Balancer Controller
- Backend Kubernetes deployments
- Frontend deployment
- Running onprem-api service
- Lambda function or event source mapping
- Bedrock real invocation code
- Kubernetes Secret
- GitHub Actions workflow
- ArgoCD
- AWS access keys

## Run

```bash
cd infra/terraform/environments/dev
cp tfvars.env.example tfvars.env.local
vi tfvars.env.local
source tfvars.env.local
aws sts get-caller-identity
terraform init -backend=false
terraform plan -out=tfplan
terraform apply tfplan
```

## Secret Principles

- Do not commit `terraform.tfvars`, `tfvars.env.local`, `.env`, state files, or
  keys.
- Do not put JWT secrets, field encryption keys, database passwords,
  `DATABASE_URL`, API keys, AWS secret keys, or VPN PSKs in Terraform code.
- RDS master password is managed by AWS Secrets Manager.
- SQS triage messages should contain metadata only.
- Bedrock inputs should be redacted or tokenized before invocation.

## Cost Notes

EKS, worker EC2, RDS Multi-AZ, VPN, NAT Gateway, CloudFront, and S3 can incur
cost. Review `terraform plan` carefully before apply.

## Next Steps

- Build and push application images.
- Deploy backend or MSA workloads to EKS.
- Deploy the onprem-api service on the placeholder EC2.
- Configure strongSwan with real tunnel settings.
- Enable Lambda/Bedrock real mode when implementation is ready.
- Add CI/CD explicitly when the deployment path is finalized.
