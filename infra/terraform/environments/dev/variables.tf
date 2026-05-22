variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name."
  type        = string
  default     = "ai-care"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Additional common tags."
  type        = map(string)
  default     = {}
}

variable "service_vpc_id" {
  description = "Existing Service VPC ID."
  type        = string
}

variable "service_public_subnet_ids" {
  description = "Existing Service VPC public subnet IDs."
  type        = list(string)
}

variable "service_private_app_subnet_ids" {
  description = "Existing Service VPC private app subnet IDs."
  type        = list(string)
}

variable "service_private_data_subnet_ids" {
  description = "Existing Service VPC private data subnet IDs."
  type        = list(string)
}

variable "service_internet_gateway_id" {
  description = "Existing Service VPC Internet Gateway ID."
  type        = string
}

variable "service_public_route_table_ids" {
  description = "Existing Service public route table IDs. Public default routes to the Service IGW are console-managed."
  type        = list(string)
}

variable "service_private_app_route_table_ids" {
  description = "Existing Service private app route table IDs for the subnets where EKS worker nodes are actually placed. Current dev nodes use subnet-0399d1d5dc9043b69 and subnet-05a7f50d03159ee6f; use the route table associated with those subnets. Public or private data route table IDs here can cause EKS NodeCreationFailure."
  type        = list(string)
}

variable "service_private_data_route_table_ids" {
  description = "Existing Service private data route table IDs."
  type        = list(string)
  default     = []
}

variable "expected_service_vpc_cidr" {
  description = "Expected existing Service VPC CIDR."
  type        = string
  default     = "10.0.0.0/16"
}

variable "onprem_vpc_id" {
  description = "Existing On-Prem VPC ID."
  type        = string
}

variable "onprem_public_subnet_id" {
  description = "Existing On-Prem public subnet ID."
  type        = string
}

variable "onprem_private_subnet_id" {
  description = "Existing On-Prem private subnet ID."
  type        = string
}

variable "onprem_internet_gateway_id" {
  description = "Existing On-Prem VPC Internet Gateway ID. Do not use the Service VPC IGW."
  type        = string
}

variable "onprem_public_route_table_id" {
  description = "Existing On-Prem public route table ID. Public default route to the On-Prem IGW is console-managed."
  type        = string
}

variable "onprem_private_route_table_id" {
  description = "Existing On-Prem private route table ID. Terraform adds the Service CIDR route to strongSwan ENI here."
  type        = string
}

variable "expected_onprem_vpc_cidr" {
  description = "Expected existing On-Prem VPC CIDR."
  type        = string
  default     = "172.16.0.0/16"
}

variable "strongswan_private_ip" {
  description = "strongSwan fixed private IP."
  type        = string
  default     = "172.16.1.10"
}

variable "fastapi_private_ip" {
  description = "FastAPI fixed private IP."
  type        = string
  default     = "172.16.10.10"
}

variable "onprem_postgres_private_ip" {
  description = "On-Prem PostgreSQL fixed private IP."
  type        = string
  default     = "172.16.10.20"
}

variable "fastapi_port" {
  description = "On-Prem FastAPI port."
  type        = number
  default     = 9000
}

variable "postgres_port" {
  description = "PostgreSQL port."
  type        = number
  default     = 5432
}

variable "onprem_ami_id" {
  description = "Optional AMI ID for On-Prem EC2 instances."
  type        = string
  default     = ""
}

variable "onprem_ec2_key_name" {
  description = "Optional EC2 key pair name. SSH is not opened by security groups."
  type        = string
  default     = ""
}

variable "onprem_instance_type" {
  description = "On-Prem placeholder EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "strongswan_instance_type" {
  description = "strongSwan EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "onprem_root_volume_size" {
  description = "On-Prem EC2 root volume size in GiB."
  type        = number
  default     = 20
}

variable "allowed_alb_cidr_blocks" {
  description = "Allowed CIDRs for future ALB HTTP/HTTPS security group ingress."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allowed_vpn_cidr_blocks" {
  description = "Allowed CIDRs for strongSwan UDP 500/4500 ingress."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "backend_container_port" {
  description = "Backend container port allowed from future ALB to EKS nodes."
  type        = number
  default     = 8080
}

variable "create_service_nat_gateway" {
  description = "Whether to create a Service NAT Gateway for private EKS worker node egress."
  type        = bool
  default     = true
}

variable "customer_gateway_bgp_asn" {
  description = "Customer Gateway BGP ASN."
  type        = number
  default     = 65000
}

variable "rds_engine_version" {
  description = "RDS PostgreSQL engine version."
  type        = string
  default     = "17.9"
}

variable "rds_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage in GiB."
  type        = number
  default     = 100
}

variable "rds_db_name" {
  description = "RDS database name."
  type        = string
  default     = "aicare"
}

variable "rds_username" {
  description = "RDS master username. Password is managed by AWS Secrets Manager."
  type        = string
  default     = "dbadmin"
}

variable "rds_multi_az" {
  description = "Whether RDS Multi-AZ is enabled."
  type        = bool
  default     = true
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period in days."
  type        = number
  default     = 7
}

variable "rds_deletion_protection" {
  description = "RDS deletion protection."
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Whether to skip final snapshot on destroy."
  type        = bool
  default     = true
}

variable "eks_cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.34"
}

variable "cluster_endpoint_public_access" {
  description = "Whether EKS public endpoint access is enabled."
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Whether EKS private endpoint access is enabled."
  type        = bool
  default     = true
}

variable "cluster_public_access_cidrs" {
  description = "CIDR blocks allowed to access the EKS public endpoint."
  type        = list(string)
}

variable "eks_node_instance_types" {
  description = "EKS node instance types."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_node_disk_size" {
  description = "EKS managed node group root volume size in GiB."
  type        = number
  default     = 20
}

variable "eks_node_desired_size" {
  description = "EKS desired node count."
  type        = number
  default     = 2
}

variable "eks_node_min_size" {
  description = "EKS minimum node count."
  type        = number
  default     = 1
}

variable "eks_node_max_size" {
  description = "EKS maximum node count."
  type        = number
  default     = 3
}

variable "app_ecr_repository_names" {
  description = "Application ECR repository names. board-service can be added explicitly if needed."
  type        = list(string)
  default = [
    "auth-user-service",
    "questionnaire-service",
    "ai-triage-service",
    "hospital-recommendation-service",
    "onprem-sensitive-api"
  ]
}

variable "ecr_force_delete" {
  description = "Whether ECR repositories should be force-deleted."
  type        = bool
  default     = false
}

variable "reports_bucket_name" {
  description = "Reports S3 bucket name."
  type        = string
  default     = ""
}

variable "reports_s3_prefix" {
  description = "Reports S3 prefix."
  type        = string
  default     = "reports/"
}

variable "reports_bucket_force_destroy" {
  description = "Whether to force destroy the reports S3 bucket."
  type        = bool
  default     = false
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 30
}

variable "backend_service_account_namespace" {
  description = "Backend Kubernetes service account namespace for IRSA."
  type        = string
  default     = "default"
}

variable "backend_service_account_name" {
  description = "Backend Kubernetes service account name for IRSA."
  type        = string
  default     = "backend"
}

variable "create_ai_processor_lambda" {
  description = "Must remain false in infra-only mode. No Lambda function is created."
  type        = bool
  default     = false
}

variable "ai_processor_image_uri" {
  description = "Reserved for future Lambda real mode."
  type        = string
  default     = ""
}

variable "enable_cicd" {
  description = "Whether to enable placeholder CI/CD IAM resources."
  type        = bool
  default     = false
}

variable "create_github_oidc_provider" {
  description = "Whether the cicd module creates a GitHub OIDC provider."
  type        = bool
  default     = false
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub repository in owner/name format."
  type        = string
  default     = "zipgaskkukdp/hospital-service-app"
}

variable "github_branch" {
  description = "GitHub branch for future GitHub OIDC trust."
  type        = string
  default     = "main"
}

variable "create_github_ecr_push_role" {
  description = "Whether to create a placeholder GitHub ECR push role."
  type        = bool
  default     = false
}

variable "create_github_eks_deploy_role" {
  description = "Whether to create a placeholder GitHub EKS deploy role."
  type        = bool
  default     = false
}

variable "create_terraform_apply_role" {
  description = "Whether to create a placeholder Terraform apply role."
  type        = bool
  default     = false
}
