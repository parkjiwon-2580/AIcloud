# Infra-Only Apply Runbook

## A. Purpose

Create AWS infrastructure with Terraform before deploying application workloads.
This runbook covers the infra-only phase for the AI-based hybrid infant
questionnaire and hospital recommendation platform.

## B. Console-Managed Network Baseline

VPC, subnet, Internet Gateway, and route table resources are created directly in
the AWS Console and kept fixed. Terraform references these network resources
through data sources.

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

Routing baseline:

- Service VPC IGW and On-Prem VPC IGW are different resources.
- Service public route tables must have console-managed
  `0.0.0.0/0 -> Service IGW`.
- On-Prem public route table must have console-managed
  `0.0.0.0/0 -> On-Prem IGW`.
- Terraform adds `0.0.0.0/0 -> NAT Gateway` to Service private app route
  tables for EKS worker node egress.
- Terraform adds `172.16.0.0/16 -> VGW` to Service private app route tables.
- Terraform adds `10.0.0.0/16 -> strongSwan ENI` to the On-Prem private route
  table.

## C. Created by This Apply

- Service NAT Gateway and NAT EIP
- Security groups
- strongSwan, FastAPI placeholder, and On-Prem PostgreSQL placeholder EC2
- AWS Site-to-Site VPN resources and routes
- RDS PostgreSQL
- EKS cluster, managed node group, OIDC provider, and add-ons
- ECR repositories
- SQS triage queue and DLQ
- S3 reports bucket
- CloudFront distribution
- CloudWatch log groups
- IAM roles and IRSA policy

## D. Not Created by This Apply

- Existing Service VPC, subnets, IGW, or route tables
- Existing On-Prem VPC, subnets, IGW, or route tables
- Service public default route to Service IGW
- On-Prem public default route to On-Prem IGW
- Backend deployment
- Frontend deployment
- Running onprem-api service
- Lambda function
- Real Bedrock invocation logic
- Kubernetes Secret
- AWS Load Balancer Controller
- CI/CD resources when `enable_cicd=false`

## E. Execution Order

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

## F. Check in the Plan

- Existing Service VPC, subnets, IGW, and route tables are not created.
- Existing On-Prem VPC, subnets, IGW, and route tables are not created.
- Service NAT Gateway is created in the first Service public subnet.
- Service private app route tables receive `0.0.0.0/0 -> NAT Gateway`.
- Service private app route tables receive `172.16.0.0/16 -> VGW`.
- On-Prem private route table receives `10.0.0.0/16 -> strongSwan ENI`.
- Service public route tables are not changed.
- On-Prem public route table is not given Service VPC IGW routes.
- ALB is not created.
- Lambda function is not created when `create_ai_processor_lambda=false`.
- CI/CD resources are not created when `enable_cicd=false`.
- Unwanted `board-service` ECR or app resources are not created.

## G. Check After Apply

- EKS cluster exists.
- Managed node group exists.
- RDS is `available`.
- ECR repositories exist.
- SQS queue and DLQ exist.
- S3 bucket and CloudFront distribution exist.
- Three On-Prem EC2 instances exist.
- VPN Connection exists.
- VPN tunnels may remain down until strongSwan is configured with real tunnel
  settings.

## H. EKS NodeCreationFailure Checklist

If the managed node group reaches `CREATE_FAILED` with
`NodeCreationFailure: Instances failed to join the kubernetes cluster`, check:

- Node IAM role has `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, and
  `AmazonEC2ContainerRegistryReadOnly`.
- Service private app route table has `0.0.0.0/0 -> NAT Gateway`.
- Service public route table has `0.0.0.0/0 -> Service IGW`.
- EKS `endpointPrivateAccess=true`.
- Launch template is not using only a custom node security group.
- Node EC2 instances also have the EKS cluster security group attached.
- Cluster security group and node security group allow required control
  plane/node traffic, especially TCP 443 and TCP 10250.
- The launch template does not set a custom AMI or custom user data unless the
  bootstrap process is fully handled.
- Service VPC DNS support and DNS hostnames are enabled, and DHCP options
  provide working DNS such as `AmazonProvidedDNS`.

Route table checks for the current dev worker subnets:

```bash
aws ec2 describe-route-tables \
  --region ap-northeast-2 \
  --filters "Name=association.subnet-id,Values=subnet-0399d1d5dc9043b69,subnet-05a7f50d03159ee6f"
```

If a worker subnet uses the VPC main route table instead of an explicit
association, inspect all Service VPC route tables:

```bash
aws ec2 describe-route-tables \
  --region ap-northeast-2 \
  --filters "Name=vpc-id,Values=<service-vpc-id>"
```

Expected routes:

- Service private app route table: `0.0.0.0/0 -> NAT Gateway`
- Service private app route table: `172.16.0.0/16 -> VGW`
- Service public route table: `0.0.0.0/0 -> Service IGW`

Service VPC DNS checks:

```bash
aws ec2 describe-vpc-attribute \
  --region ap-northeast-2 \
  --vpc-id <service-vpc-id> \
  --attribute enableDnsSupport

aws ec2 describe-vpc-attribute \
  --region ap-northeast-2 \
  --vpc-id <service-vpc-id> \
  --attribute enableDnsHostnames
```

Both values should be `true`.

`aws-auth` check:

```bash
kubectl -n kube-system get configmap aws-auth -o yaml
```

Confirm the node role is present:

```text
arn:aws:iam::105959916837:role/ai-care-dev-eks-node-role
```

If the role is missing, managed node group access mapping may not have been
applied. Check whether manual `aws-auth` mapping or the EKS access config path
is needed before recreating the node group.

Failed node bootstrap log check:

```bash
aws ec2 get-console-output \
  --region ap-northeast-2 \
  --instance-id <failed-node-instance-id> \
  --latest
```

Search the output for:

- `bootstrap`
- `kubelet`
- `timeout`
- `Unauthorized`
- `unable to resolve`
- `x509`

## I. Cost Notes

- EKS cluster and worker nodes incur cost.
- RDS Multi-AZ incurs cost.
- EC2 instances incur cost.
- Site-to-Site VPN incurs cost.
- NAT Gateway incurs hourly and data processing cost.
- CloudFront and S3 incur usage-based cost.

## J. Destroy Notes

- `terraform destroy` removes only resources managed by this Terraform state.
- Console-created Service and On-Prem VPC, subnets, IGWs, and route tables are
  not destroy targets.
- S3 bucket deletion can fail when objects remain in the bucket.
- RDS uses `skip_final_snapshot=true` for dev.
