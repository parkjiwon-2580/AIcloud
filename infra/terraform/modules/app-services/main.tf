data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_region" "current" {}

locals {
  name_prefix                 = "${var.project_name}-${var.environment}"
  reports_bucket_name         = var.reports_bucket_name != "" ? var.reports_bucket_name : "${local.name_prefix}-reports-${data.aws_caller_identity.current.account_id}"
  reports_s3_prefix           = var.reports_s3_prefix == "" ? "" : "${trimsuffix(var.reports_s3_prefix, "/")}/"
  reports_object_arn          = "${aws_s3_bucket.reports.arn}/${local.reports_s3_prefix}*"
  reports_origin_id           = "${local.name_prefix}-reports-origin"
  oidc_provider_hostpath      = replace(var.eks_oidc_issuer_url, "https://", "")
  backend_log_group_name      = "/${var.project_name}/${var.environment}/backend"
  ai_processor_log_group_name = "/${var.project_name}/${var.environment}/ai-processor"
}

check "ai_processor_lambda_disabled" {
  assert {
    condition     = var.create_ai_processor_lambda == false
    error_message = "create_ai_processor_lambda=true is not implemented in infra-only mode. This module intentionally creates no Lambda function resources."
  }
}

resource "aws_ecr_repository" "app" {
  for_each             = toset(var.app_ecr_repository_names)
  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = var.ecr_force_delete

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = each.value
  })
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the latest 20 images."
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_sqs_queue" "triage_dlq" {
  name                      = "${local.name_prefix}-triage-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-triage-dlq"
  })
}

# SQS messages must contain metadata only, such as questionnaire_id, user_id,
# and created_at. Do not put names, phone numbers, addresses, or raw
# questionnaire text in SQS.
resource "aws_sqs_queue" "triage" {
  name                       = "${local.name_prefix}-triage-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.triage_dlq.arn
    maxReceiveCount     = 5
  })

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-triage-queue"
  })
}

# This bucket stores AI report objects only.
resource "aws_s3_bucket" "reports" {
  bucket        = local.reports_bucket_name
  force_destroy = var.reports_bucket_force_destroy

  tags = merge(var.tags, {
    Name = local.reports_bucket_name
  })
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "reports" {
  name                              = "${local.name_prefix}-reports-oac"
  description                       = "OAC for AI reports S3 bucket."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "reports" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.name_prefix} AI reports distribution"
  price_class     = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.reports.bucket_regional_domain_name
    origin_id                = local.reports_origin_id
    origin_path              = local.reports_s3_prefix == "" ? "" : "/${trimsuffix(local.reports_s3_prefix, "/")}"
    origin_access_control_id = aws_cloudfront_origin_access_control.reports.id
  }

  default_cache_behavior {
    target_origin_id       = local.reports_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 3600

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-reports-cdn"
  })
}

data "aws_iam_policy_document" "reports_bucket" {
  statement {
    sid     = "AllowCloudFrontOACReadReports"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    resources = [local.reports_object_arn]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.reports.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "reports" {
  bucket = aws_s3_bucket.reports.id
  policy = data.aws_iam_policy_document.reports_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.reports]
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = local.backend_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(var.tags, {
    Name = local.backend_log_group_name
  })
}

resource "aws_cloudwatch_log_group" "ai_processor" {
  name              = local.ai_processor_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(var.tags, {
    Name = local.ai_processor_log_group_name
  })
}

data "aws_iam_policy_document" "backend_irsa_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.eks_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_hostpath}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_hostpath}:sub"
      values   = ["system:serviceaccount:${var.backend_service_account_namespace}:${var.backend_service_account_name}"]
    }
  }
}

resource "aws_iam_role" "backend_irsa" {
  name               = "${local.name_prefix}-backend-irsa-role"
  assume_role_policy = data.aws_iam_policy_document.backend_irsa_assume.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-backend-irsa-role"
  })
}

data "aws_iam_policy_document" "backend" {
  statement {
    sid       = "TriageQueueMetadataOnly"
    effect    = "Allow"
    actions   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.triage.arn]
  }

  statement {
    sid       = "ReportsObjectAccess"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = [local.reports_object_arn]
  }

  # Do not send direct identifiers to Bedrock. The application layer must
  # redact or tokenize inputs before model invocation.
  statement {
    sid       = "BedrockInvoke"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = ["*"]
  }

  statement {
    sid    = "CloudWatchLogsWrite"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents"
    ]
    resources = ["${aws_cloudwatch_log_group.backend.arn}:*"]
  }
}

resource "aws_iam_policy" "backend" {
  name        = "${local.name_prefix}-backend-policy"
  description = "Backend IRSA policy for infra-only resources."
  policy      = data.aws_iam_policy_document.backend.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-backend-policy"
  })
}

resource "aws_iam_role_policy_attachment" "backend" {
  role       = aws_iam_role.backend_irsa.name
  policy_arn = aws_iam_policy.backend.arn
}

data "aws_iam_policy_document" "ai_processor_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ai_processor" {
  name               = "${local.name_prefix}-ai-processor-placeholder-role"
  assume_role_policy = data.aws_iam_policy_document.ai_processor_assume.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-ai-processor-placeholder-role"
  })
}

data "aws_iam_policy_document" "ai_processor" {
  statement {
    sid    = "ConsumeTriageQueueMetadataOnly"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.triage.arn]
  }

  statement {
    sid       = "ReportsObjectAccess"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = [local.reports_object_arn]
  }

  statement {
    sid       = "BedrockInvoke"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = ["*"]
  }

  statement {
    sid    = "CloudWatchLogsWrite"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents"
    ]
    resources = ["${aws_cloudwatch_log_group.ai_processor.arn}:*"]
  }
}

resource "aws_iam_policy" "ai_processor" {
  name        = "${local.name_prefix}-ai-processor-placeholder-policy"
  description = "Placeholder AI processor policy. No Lambda function is created in infra-only mode."
  policy      = data.aws_iam_policy_document.ai_processor.json

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-ai-processor-placeholder-policy"
  })
}

resource "aws_iam_role_policy_attachment" "ai_processor" {
  role       = aws_iam_role.ai_processor.name
  policy_arn = aws_iam_policy.ai_processor.arn
}
