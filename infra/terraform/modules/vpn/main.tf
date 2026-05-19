locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_vpn_gateway" "this" {
  vpc_id = var.service_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-service-vgw"
  })
}

resource "aws_customer_gateway" "strongswan" {
  bgp_asn    = var.customer_gateway_bgp_asn
  ip_address = var.strongswan_public_ip
  type       = "ipsec.1"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-strongswan-cgw"
  })
}

# Static Site-to-Site VPN. Do not output customer_gateway_configuration:
# it can include tunnel settings and PSK-related sensitive material in state.
resource "aws_vpn_connection" "this" {
  vpn_gateway_id      = aws_vpn_gateway.this.id
  customer_gateway_id = aws_customer_gateway.strongswan.id
  type                = "ipsec.1"
  static_routes_only  = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-service-to-onprem-vpn"
  })
}

resource "aws_vpn_connection_route" "onprem" {
  vpn_connection_id      = aws_vpn_connection.this.id
  destination_cidr_block = var.onprem_vpc_cidr_block
}

# Service public route tables do not receive VPN routes. Only Service private
# app route tables get 172.16.0.0/16 -> VGW. If a route table already has this
# destination, AWS returns a duplicate route error; import or remove the route
# before apply.
resource "aws_route" "service_private_app_to_onprem" {
  for_each               = toset(var.service_private_app_route_table_ids)
  route_table_id         = each.value
  destination_cidr_block = var.onprem_vpc_cidr_block
  gateway_id             = aws_vpn_gateway.this.id

  depends_on = [aws_vpn_gateway.this]
}

resource "aws_route" "onprem_to_service" {
  route_table_id         = var.onprem_private_route_table_id
  destination_cidr_block = var.service_vpc_cidr_block
  network_interface_id   = var.strongswan_network_interface_id
}
