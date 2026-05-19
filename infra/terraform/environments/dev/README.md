# Dev Terraform Environment

This environment creates infra-only AWS resources for the AI Care hybrid
service. It does not deploy application code, Kubernetes manifests, ALB
Controller, Lambda functions, GitHub Actions workflows, or frontend/backend
runtime workloads.

## Before Running

Fill either `tfvars.env.local` from `tfvars.env.example` or create a local
`terraform.tfvars` from `terraform.tfvars.example`. Do not commit either local
file.

Required console-managed network values:

- `service_vpc_id`
- `service_public_subnet_ids`
- `service_private_app_subnet_ids`
- `service_private_data_subnet_ids`
- `service_internet_gateway_id`
- `service_public_route_table_ids`
- `service_private_app_route_table_ids`
- `service_private_data_route_table_ids`
- `onprem_vpc_id`
- `onprem_public_subnet_id`
- `onprem_private_subnet_id`
- `onprem_internet_gateway_id`
- `onprem_public_route_table_id`
- `onprem_private_route_table_id`

Other required real values:

- `reports_bucket_name`
- `cluster_public_access_cidrs`

## Routing Baseline

- Service public route tables must have console-managed
  `0.0.0.0/0 -> Service IGW`.
- On-Prem public route table must have console-managed
  `0.0.0.0/0 -> On-Prem IGW`.
- Terraform adds `0.0.0.0/0 -> NAT Gateway` to Service private app route
  tables.
- Terraform adds `172.16.0.0/16 -> VGW` to Service private app route tables.
- Terraform adds `10.0.0.0/16 -> strongSwan ENI` to the On-Prem private route
  table.
- Service VPC IGW and On-Prem VPC IGW are different resources and must not be
  mixed.

## Console VPC DNS Checks

Terraform does not modify the console-managed Service VPC DNS attributes.
Before creating or recreating the EKS managed node group, confirm:

- Service VPC `enableDnsSupport = true`
- Service VPC `enableDnsHostnames = true`
- The VPC DHCP options set uses `AmazonProvidedDNS` or another DNS setup that
  can resolve AWS/EKS endpoints correctly.

## Failed Node Group Recovery

If a previous apply left `ai-care-dev-eks-ng` in `CREATE_FAILED`, clean up only
the failed node group before recreating it. Do not run a full
`terraform destroy`.

Check whether Terraform state contains the node group:

```bash
terraform state list | grep aws_eks_node_group
```

If the node group is not in state, delete the failed node group through AWS:

```bash
aws eks delete-nodegroup \
  --cluster-name ai-care-dev-eks \
  --nodegroup-name ai-care-dev-eks-ng \
  --region ap-northeast-2
```

If the node group is in state, remove only that Terraform-managed target:

```bash
terraform destroy -target=module.eks.aws_eks_node_group.this
```

## Commands

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

## Defaults

- Region: `ap-northeast-2`
- Project: `ai-care`
- Environment: `dev`
- Console-managed VPC/subnet/IGW/route table resources are referenced by data
  sources only.
- CI/CD: disabled by `enable_cicd=false`
- AI processor Lambda: disabled by `create_ai_processor_lambda=false`
- Service NAT Gateway: enabled by `create_service_nat_gateway=true`
- ECR default repositories exclude `board-service`; add it explicitly to
  `app_ecr_repository_names` if needed later.

## Secrets

Do not put DB passwords, JWT secrets, field encryption keys, API keys, AWS
secret keys, database URLs, or VPN PSKs in Terraform files. RDS master password
management is delegated to AWS Secrets Manager.
