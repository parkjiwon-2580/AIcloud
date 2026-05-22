output "service_nat_gateway_id" {
  description = "Service NAT Gateway ID."
  value       = try(aws_nat_gateway.this[0].id, null)
}

output "service_nat_gateway_eip_allocation_id" {
  description = "Service NAT Gateway Elastic IP allocation ID."
  value       = try(aws_eip.nat[0].allocation_id, null)
}

output "service_nat_gateway_public_ip" {
  description = "Service NAT Gateway Elastic IP public address."
  value       = try(aws_eip.nat[0].public_ip, null)
}

output "service_nat_gateway_subnet_id" {
  description = "Service public subnet ID where the NAT Gateway is created."
  value       = var.create_service_nat_gateway ? var.service_public_subnet_id_for_nat : null
}

output "service_nat_route_table_ids" {
  description = "Service private app route table IDs that receive 0.0.0.0/0 -> Service NAT Gateway."
  value       = var.create_service_nat_gateway ? var.service_private_app_route_table_ids : []
}

output "service_private_app_nat_route_table_ids" {
  description = "Service private app route table IDs routed to the Service NAT Gateway."
  value       = var.create_service_nat_gateway ? var.service_private_app_route_table_ids : []
}
