output "strongswan_instance_id" {
  description = "strongSwan EC2 instance ID."
  value       = aws_instance.strongswan.id
}

output "strongswan_private_ip" {
  description = "strongSwan private IP."
  value       = aws_instance.strongswan.private_ip
}

output "strongswan_public_ip" {
  description = "strongSwan Elastic IP public address."
  value       = aws_eip.strongswan.public_ip
}

output "strongswan_eip_allocation_id" {
  description = "strongSwan Elastic IP allocation ID."
  value       = aws_eip.strongswan.allocation_id
}

output "strongswan_network_interface_id" {
  description = "strongSwan primary network interface ID."
  value       = aws_instance.strongswan.primary_network_interface_id
}

output "fastapi_instance_id" {
  description = "FastAPI placeholder EC2 instance ID."
  value       = aws_instance.fastapi.id
}

output "fastapi_private_ip" {
  description = "FastAPI placeholder private IP."
  value       = aws_instance.fastapi.private_ip
}

output "onprem_postgres_instance_id" {
  description = "On-Prem PostgreSQL placeholder EC2 instance ID."
  value       = aws_instance.onprem_postgres.id
}

output "onprem_postgres_private_ip" {
  description = "On-Prem PostgreSQL placeholder private IP."
  value       = aws_instance.onprem_postgres.private_ip
}
