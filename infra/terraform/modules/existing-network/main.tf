# This module intentionally creates no resources.
# It only validates and exposes console-managed Service VPC network identifiers.

data "aws_vpc" "service" {
  id = var.service_vpc_id
}

data "aws_subnet" "public" {
  for_each = toset(var.service_public_subnet_ids)
  id       = each.value
}

data "aws_subnet" "private_app" {
  for_each = toset(var.service_private_app_subnet_ids)
  id       = each.value
}

data "aws_subnet" "private_data" {
  for_each = toset(var.service_private_data_subnet_ids)
  id       = each.value
}

data "aws_internet_gateway" "service" {
  internet_gateway_id = var.service_internet_gateway_id

  filter {
    name   = "attachment.vpc-id"
    values = [var.service_vpc_id]
  }
}

data "aws_route_table" "public" {
  for_each       = toset(var.service_public_route_table_ids)
  route_table_id = each.value
}

data "aws_route_table" "private_app" {
  for_each       = toset(var.service_private_app_route_table_ids)
  route_table_id = each.value
}

data "aws_route_table" "private_data" {
  for_each       = toset(var.service_private_data_route_table_ids)
  route_table_id = each.value
}

check "service_vpc_cidr" {
  assert {
    condition     = data.aws_vpc.service.cidr_block == var.expected_service_vpc_cidr
    error_message = "The existing Service VPC CIDR must be ${var.expected_service_vpc_cidr}."
  }
}

check "service_subnets_belong_to_service_vpc" {
  assert {
    condition = alltrue(concat(
      [for subnet in data.aws_subnet.public : subnet.vpc_id == var.service_vpc_id],
      [for subnet in data.aws_subnet.private_app : subnet.vpc_id == var.service_vpc_id],
      [for subnet in data.aws_subnet.private_data : subnet.vpc_id == var.service_vpc_id]
    ))
    error_message = "All Service subnet IDs must belong to the Service VPC."
  }
}

check "service_route_tables_belong_to_service_vpc" {
  assert {
    condition = alltrue(concat(
      [for route_table in data.aws_route_table.public : route_table.vpc_id == var.service_vpc_id],
      [for route_table in data.aws_route_table.private_app : route_table.vpc_id == var.service_vpc_id],
      [for route_table in data.aws_route_table.private_data : route_table.vpc_id == var.service_vpc_id]
    ))
    error_message = "All Service route table IDs must belong to the Service VPC."
  }
}
