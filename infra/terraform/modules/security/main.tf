locals {
  name_prefix = "${var.project_name}-${var.environment}"

  security_groups = {
    alb             = aws_security_group.alb.id
    eks_node        = aws_security_group.eks_node.id
    rds             = aws_security_group.rds.id
    strongswan      = aws_security_group.strongswan.id
    fastapi         = aws_security_group.fastapi.id
    onprem_postgres = aws_security_group.onprem_postgres.id
  }
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Future ALB security group. No ALB is created in infra-only."
  vpc_id      = var.service_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-alb-sg"
  })
}

resource "aws_security_group" "eks_node" {
  name        = "${local.name_prefix}-eks-node-sg"
  description = "EKS node security group."
  vpc_id      = var.service_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-eks-node-sg"
  })
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "RDS PostgreSQL security group."
  vpc_id      = var.service_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

resource "aws_security_group" "strongswan" {
  name        = "${local.name_prefix}-strongswan-sg"
  description = "strongSwan VPN endpoint security group."
  vpc_id      = var.onprem_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-strongswan-sg"
  })
}

resource "aws_security_group" "fastapi" {
  name        = "${local.name_prefix}-onprem-fastapi-sg"
  description = "On-Prem FastAPI placeholder security group."
  vpc_id      = var.onprem_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-onprem-fastapi-sg"
  })
}

resource "aws_security_group" "onprem_postgres" {
  name        = "${local.name_prefix}-onprem-postgres-sg"
  description = "On-Prem PostgreSQL placeholder security group."
  vpc_id      = var.onprem_vpc_id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-onprem-postgres-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  for_each          = toset(var.allowed_alb_cidr_blocks)
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP access to future ALB."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  for_each          = toset(var.allowed_alb_cidr_blocks)
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = each.value
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS access to future ALB."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "eks_node_from_alb" {
  security_group_id            = aws_security_group.eks_node.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = var.backend_container_port
  to_port                      = var.backend_container_port
  ip_protocol                  = "tcp"
  description                  = "Backend container traffic from future ALB."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "eks_node_self" {
  security_group_id            = aws_security_group.eks_node.id
  referenced_security_group_id = aws_security_group.eks_node.id
  ip_protocol                  = "-1"
  description                  = "Node-to-node traffic."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_eks_node" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.eks_node.id
  from_port                    = var.postgres_port
  to_port                      = var.postgres_port
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from EKS nodes."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "strongswan_udp_500" {
  for_each          = toset(var.allowed_vpn_cidr_blocks)
  security_group_id = aws_security_group.strongswan.id
  cidr_ipv4         = each.value
  from_port         = 500
  to_port           = 500
  ip_protocol       = "udp"
  description       = "IPsec IKE."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "strongswan_udp_4500" {
  for_each          = toset(var.allowed_vpn_cidr_blocks)
  security_group_id = aws_security_group.strongswan.id
  cidr_ipv4         = each.value
  from_port         = 4500
  to_port           = 4500
  ip_protocol       = "udp"
  description       = "IPsec NAT-T."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "fastapi_from_service_vpc" {
  security_group_id = aws_security_group.fastapi.id
  cidr_ipv4         = var.service_vpc_cidr_block
  from_port         = var.fastapi_port
  to_port           = var.fastapi_port
  ip_protocol       = "tcp"
  description       = "FastAPI placeholder from Service VPC."

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "onprem_postgres_from_fastapi" {
  security_group_id            = aws_security_group.onprem_postgres.id
  referenced_security_group_id = aws_security_group.fastapi.id
  from_port                    = var.postgres_port
  to_port                      = var.postgres_port
  ip_protocol                  = "tcp"
  description                  = "On-Prem PostgreSQL from FastAPI placeholder."

  tags = var.tags
}

resource "aws_vpc_security_group_egress_rule" "all" {
  for_each          = local.security_groups
  security_group_id = each.value
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound traffic."

  tags = var.tags
}
