output "alb_security_group_id" {
  description = "Future ALB security group ID."
  value       = aws_security_group.alb.id
}

output "eks_node_security_group_id" {
  description = "EKS node security group ID."
  value       = aws_security_group.eks_node.id
}

output "rds_security_group_id" {
  description = "RDS PostgreSQL security group ID."
  value       = aws_security_group.rds.id
}

output "strongswan_security_group_id" {
  description = "strongSwan security group ID."
  value       = aws_security_group.strongswan.id
}

output "fastapi_security_group_id" {
  description = "On-Prem FastAPI placeholder security group ID."
  value       = aws_security_group.fastapi.id
}

output "onprem_postgres_security_group_id" {
  description = "On-Prem PostgreSQL placeholder security group ID."
  value       = aws_security_group.onprem_postgres.id
}
