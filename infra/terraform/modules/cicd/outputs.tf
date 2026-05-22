output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN, when configured."
  value       = try(aws_iam_openid_connect_provider.github[0].arn, var.github_oidc_provider_arn != "" ? var.github_oidc_provider_arn : null)
}

output "github_ecr_push_role_arn" {
  description = "Placeholder GitHub ECR push role ARN."
  value       = try(aws_iam_role.github_ecr_push[0].arn, null)
}

output "github_eks_deploy_role_arn" {
  description = "Placeholder GitHub EKS deploy role ARN."
  value       = try(aws_iam_role.github_eks_deploy[0].arn, null)
}

output "terraform_apply_role_arn" {
  description = "Placeholder Terraform apply role ARN."
  value       = try(aws_iam_role.terraform_apply[0].arn, null)
}
