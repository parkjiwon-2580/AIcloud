variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "create_github_oidc_provider" {
  description = "Whether to create a GitHub Actions OIDC provider."
  type        = bool
  default     = false
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN. Used when provider creation is disabled."
  type        = string
  default     = ""
}

variable "github_oidc_thumbprint_list" {
  description = "Thumbprints for GitHub Actions OIDC provider."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "github_repository" {
  description = "GitHub repository in owner/name format."
  type        = string
}

variable "github_branch" {
  description = "GitHub branch allowed to assume roles."
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

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
