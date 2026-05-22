output "rds_instance_id" {
  description = "RDS instance ID."
  value       = aws_db_instance.this.id
}

output "rds_instance_arn" {
  description = "RDS instance ARN."
  value       = aws_db_instance.this.arn
}

output "rds_endpoint" {
  description = "RDS endpoint host:port."
  value       = aws_db_instance.this.endpoint
}

output "rds_address" {
  description = "RDS address."
  value       = aws_db_instance.this.address
}

output "rds_port" {
  description = "RDS port."
  value       = aws_db_instance.this.port
}

output "rds_db_name" {
  description = "RDS database name."
  value       = aws_db_instance.this.db_name
}

output "rds_username" {
  description = "RDS master username."
  value       = aws_db_instance.this.username
}

output "rds_subnet_group_name" {
  description = "RDS subnet group name."
  value       = aws_db_subnet_group.this.name
}

output "rds_master_user_secret_arn" {
  description = "AWS Secrets Manager secret ARN for the RDS master user."
  value       = try(aws_db_instance.this.master_user_secret[0].secret_arn, null)
  sensitive   = true
}
