locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_eip" "nat" {
  count  = var.create_service_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-service-nat-eip"
  })
}

resource "aws_nat_gateway" "this" {
  count         = var.create_service_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = var.service_public_subnet_id_for_nat

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-service-nat"
  })
}

# Service public route tables keep their console-managed 0.0.0.0/0 -> Service
# IGW routes. This module only adds private app egress through NAT. If a private
# app route table already has any 0.0.0.0/0 route, AWS returns a duplicate route
# error; remove or import that route before apply.
resource "aws_route" "private_app_default_to_nat" {
  for_each = var.create_service_nat_gateway ? toset(var.service_private_app_route_table_ids) : toset([])

  route_table_id         = each.value
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}
