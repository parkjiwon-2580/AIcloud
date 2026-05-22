output "ecr_repository_urls" {
  description = "ECR repository URLs by repository name."
  value       = { for name, repo in aws_ecr_repository.app : name => repo.repository_url }
}

output "ecr_repository_arns" {
  description = "ECR repository ARNs by repository name."
  value       = { for name, repo in aws_ecr_repository.app : name => repo.arn }
}

output "triage_queue_arn" {
  description = "Triage SQS queue ARN."
  value       = aws_sqs_queue.triage.arn
}

output "triage_queue_url" {
  description = "Triage SQS queue URL."
  value       = aws_sqs_queue.triage.url
}

output "triage_dlq_arn" {
  description = "Triage DLQ ARN."
  value       = aws_sqs_queue.triage_dlq.arn
}

output "triage_dlq_url" {
  description = "Triage DLQ URL."
  value       = aws_sqs_queue.triage_dlq.url
}

output "reports_bucket_name" {
  description = "Reports S3 bucket name."
  value       = aws_s3_bucket.reports.bucket
}

output "reports_bucket_arn" {
  description = "Reports S3 bucket ARN."
  value       = aws_s3_bucket.reports.arn
}

output "reports_s3_prefix" {
  description = "Reports S3 prefix."
  value       = local.reports_s3_prefix
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.reports.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.reports.domain_name
}

output "backend_log_group_name" {
  description = "Backend CloudWatch log group name."
  value       = aws_cloudwatch_log_group.backend.name
}

output "ai_processor_log_group_name" {
  description = "AI processor CloudWatch log group name."
  value       = aws_cloudwatch_log_group.ai_processor.name
}

output "backend_irsa_role_arn" {
  description = "Backend IRSA role ARN."
  value       = aws_iam_role.backend_irsa.arn
}

output "backend_irsa_policy_arn" {
  description = "Backend IRSA policy ARN."
  value       = aws_iam_policy.backend.arn
}

output "ai_processor_role_arn" {
  description = "AI processor placeholder role ARN."
  value       = aws_iam_role.ai_processor.arn
}

output "ai_processor_policy_arn" {
  description = "AI processor placeholder policy ARN."
  value       = aws_iam_policy.ai_processor.arn
}
