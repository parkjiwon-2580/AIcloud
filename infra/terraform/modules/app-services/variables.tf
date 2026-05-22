variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "app_ecr_repository_names" {
  description = "Application ECR repository names. board-service is intentionally not included by default."
  type        = list(string)
}

variable "ecr_force_delete" {
  description = "Whether ECR repositories should be force-deleted."
  type        = bool
  default     = false
}

variable "reports_bucket_name" {
  description = "Reports S3 bucket name. When empty, a deterministic account-scoped name is used."
  type        = string
  default     = ""
}

variable "reports_s3_prefix" {
  description = "S3 prefix for AI reports."
  type        = string
  default     = "reports/"
}

variable "reports_bucket_force_destroy" {
  description = "Whether to force destroy the reports bucket."
  type        = bool
  default     = false
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 30
}

variable "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN for backend IRSA."
  type        = string
}

variable "eks_oidc_issuer_url" {
  description = "EKS OIDC issuer URL for backend IRSA."
  type        = string
}

variable "backend_service_account_namespace" {
  description = "Kubernetes namespace for the backend service account."
  type        = string
  default     = "default"
}

variable "backend_service_account_name" {
  description = "Kubernetes service account name for backend IRSA."
  type        = string
  default     = "backend"
}

variable "create_ai_processor_lambda" {
  description = "Infra-only guard. Lambda resources are intentionally not created when false."
  type        = bool
  default     = false
}

variable "ai_processor_image_uri" {
  description = "Reserved for future Lambda real mode. Not used in infra-only apply."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
