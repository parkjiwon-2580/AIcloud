data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name_prefix              = "${var.project_name}-${var.environment}"
  github_oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.github_oidc_provider_arn
  github_oidc_hostpath     = "token.actions.githubusercontent.com"
  github_subject           = "repo:${var.github_repository}:ref:refs/heads/${var.github_branch}"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 1 : 0

  url             = "https://${local.github_oidc_hostpath}"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.github_oidc_thumbprint_list

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-github-oidc"
  })
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc_hostpath}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.github_oidc_hostpath}:sub"
      values   = [local.github_subject]
    }
  }
}

resource "aws_iam_role" "github_ecr_push" {
  count = var.create_github_ecr_push_role ? 1 : 0

  name               = "${local.name_prefix}-github-ecr-push-role"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-github-ecr-push-role"
  })
}

resource "aws_iam_role" "github_eks_deploy" {
  count = var.create_github_eks_deploy_role ? 1 : 0

  name               = "${local.name_prefix}-github-eks-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-github-eks-deploy-role"
  })
}

resource "aws_iam_role" "terraform_apply" {
  count = var.create_terraform_apply_role ? 1 : 0

  name               = "${local.name_prefix}-terraform-apply-role"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-terraform-apply-role"
  })
}
