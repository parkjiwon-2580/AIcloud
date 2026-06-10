# This module intentionally creates no resources.
# It only validates and exposes console-managed On-Prem VPC network identifiers.
data "aws_vpc" "onprem" {
  id = var.onprem_vpc_id
}

data "aws_subnet" "public" {
  id = var.onprem_public_subnet_id
}

data "aws_subnet" "private" {
  id = var.onprem_private_subnet_id
}

# This must be the IGW attached to the On-Prem VPC. Do not pass the Service VPC
# IGW here; Service and On-Prem internet gateways are distinct VPC resources.
data "aws_internet_gateway" "onprem" {
  internet_gateway_id = var.onprem_internet_gateway_id

  filter {
    name   = "attachment.vpc-id"
    values = [var.onprem_vpc_id]
  }
}

data "aws_route_table" "public" {
  route_table_id = var.onprem_public_route_table_id
}

data "aws_route_table" "private" {
  route_table_id = var.onprem_private_route_table_id
}

check "onprem_vpc_cidr" {
  assert {
    condition     = data.aws_vpc.onprem.cidr_block == var.expected_onprem_vpc_cidr
    error_message = "The existing On-Prem VPC CIDR must be ${var.expected_onprem_vpc_cidr}."
  }
}

check "onprem_subnets_belong_to_onprem_vpc" {
  assert {
    condition = alltrue([
      data.aws_subnet.public.vpc_id == var.onprem_vpc_id,
      data.aws_subnet.private.vpc_id == var.onprem_vpc_id
    ])
    error_message = "All On-Prem subnet IDs must belong to the On-Prem VPC."
  }
}

check "onprem_route_tables_belong_to_onprem_vpc" {
  assert {
    condition = alltrue([
      data.aws_route_table.public.vpc_id == var.onprem_vpc_id,
      data.aws_route_table.private.vpc_id == var.onprem_vpc_id
    ])
    error_message = "All On-Prem route table IDs must belong to the On-Prem VPC."
  }
}

resource "aws_vpc_endpoint" "ssm" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.ssm"

  vpc_endpoint_type = "Interface"

  subnet_ids = [
    var.onprem_private_subnet_id
  ]

  security_group_ids = [
    var.ssm_endpoint_security_group_id
]

  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-ssm-endpoint"
  })
}

resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.ssmmessages"

  vpc_endpoint_type = "Interface"

  subnet_ids = [
    var.onprem_private_subnet_id
  ]

  security_group_ids = [
    var.ssm_endpoint_security_group_id
  ]

  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-ssmmessages-endpoint"
  })
}

resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.ec2messages"

  vpc_endpoint_type = "Interface"

  subnet_ids = [
    var.onprem_private_subnet_id
  ]

  security_group_ids = [
    var.ssm_endpoint_security_group_id
  ]

  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-ec2messages-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.ecr.api"

  vpc_endpoint_type = "Interface"

  subnet_ids = [
    var.onprem_private_subnet_id
  ]

  security_group_ids = [
    var.ssm_endpoint_security_group_id
  ]

  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-ecr-api-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.ecr.dkr"

  vpc_endpoint_type = "Interface"

  subnet_ids = [
    var.onprem_private_subnet_id
  ]

  security_group_ids = [
    var.ssm_endpoint_security_group_id
  ]

  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-ecr-dkr-endpoint"
  })
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id = var.onprem_vpc_id

  service_name = "com.amazonaws.ap-northeast-2.s3"

  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    var.onprem_private_route_table_id
  ]

  tags = merge(var.tags, {
    Name = "ai-care-dev-onprem-s3-endpoint"
  })
}