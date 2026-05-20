output "onprem_vpc_id" {
  description = "Existing On-Prem VPC ID."
  value       = data.aws_vpc.onprem.id
}

output "onprem_vpc_cidr_block" {
  description = "CIDR block of the existing On-Prem VPC."
  value       = data.aws_vpc.onprem.cidr_block
}

output "onprem_public_subnet_id" {
  description = "Existing On-Prem public subnet ID."
  value       = data.aws_subnet.public.id
}

output "onprem_private_subnet_id" {
  description = "Existing On-Prem private subnet ID."
  value       = data.aws_subnet.private.id
}

output "onprem_internet_gateway_id" {
  description = "Existing On-Prem VPC Internet Gateway ID."
  value       = data.aws_internet_gateway.onprem.id
}

output "onprem_public_route_table_id" {
  description = "Existing On-Prem public route table ID."
  value       = data.aws_route_table.public.id
}

output "onprem_private_route_table_id" {
  description = "Existing On-Prem private route table ID."
  value       = data.aws_route_table.private.id
}
