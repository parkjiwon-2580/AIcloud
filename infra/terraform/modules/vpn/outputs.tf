output "vpn_gateway_id" {
  description = "AWS Virtual Private Gateway ID."
  value       = aws_vpn_gateway.this.id
}

output "customer_gateway_id" {
  description = "AWS Customer Gateway ID."
  value       = aws_customer_gateway.strongswan.id
}

output "vpn_connection_id" {
  description = "AWS Site-to-Site VPN connection ID."
  value       = aws_vpn_connection.this.id
}

output "vpn_connection_tunnel1_address" {
  description = "AWS tunnel 1 outside address."
  value       = aws_vpn_connection.this.tunnel1_address
}

output "vpn_connection_tunnel2_address" {
  description = "AWS tunnel 2 outside address."
  value       = aws_vpn_connection.this.tunnel2_address
}

output "vpn_connection_tunnel1_inside_cidr" {
  description = "AWS tunnel 1 inside CIDR."
  value       = aws_vpn_connection.this.tunnel1_inside_cidr
}

output "vpn_connection_tunnel2_inside_cidr" {
  description = "AWS tunnel 2 inside CIDR."
  value       = aws_vpn_connection.this.tunnel2_inside_cidr
}

output "service_to_onprem_route_table_ids" {
  description = "Service private app route table IDs with route to On-Prem."
  value       = keys(aws_route.service_private_app_to_onprem)
}

output "onprem_to_service_route_table_id" {
  description = "On-Prem private route table ID with route to Service VPC."
  value       = aws_route.onprem_to_service.route_table_id
}
