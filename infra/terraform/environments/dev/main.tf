terraform {
  required_version = "= 1.14.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

locals {
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Scope       = "infra-only"
  })

  frontend_domain_names = distinct(concat([var.domain_name], var.frontend_domain_names))
}

moved {
  from = module.nat_gateway.aws_eip.nat[0]
  to   = module.service_nat_gateway.aws_eip.nat[0]
}

moved {
  from = module.nat_gateway.aws_nat_gateway.this[0]
  to   = module.service_nat_gateway.aws_nat_gateway.this[0]
}

moved {
  from = module.nat_gateway.aws_route.private_default_to_nat
  to   = module.service_nat_gateway.aws_route.private_app_default_to_nat
}

module "existing_network" {
  source = "../../modules/existing-network"

  service_vpc_id                       = var.service_vpc_id
  service_public_subnet_ids            = var.service_public_subnet_ids
  service_private_app_subnet_ids       = var.service_private_app_subnet_ids
  service_private_data_subnet_ids      = var.service_private_data_subnet_ids
  service_internet_gateway_id          = var.service_internet_gateway_id
  service_public_route_table_ids       = var.service_public_route_table_ids
  service_private_app_route_table_ids  = var.service_private_app_route_table_ids
  service_private_data_route_table_ids = var.service_private_data_route_table_ids
  expected_service_vpc_cidr            = var.expected_service_vpc_cidr
  tags                                 = local.common_tags
}

module "onprem_network" {
  source = "../../modules/onprem-network"

  onprem_vpc_id                  = var.onprem_vpc_id
  onprem_public_subnet_id        = var.onprem_public_subnet_id
  onprem_private_subnet_id       = var.onprem_private_subnet_id
  onprem_internet_gateway_id     = var.onprem_internet_gateway_id
  onprem_public_route_table_id   = var.onprem_public_route_table_id
  onprem_private_route_table_id  = var.onprem_private_route_table_id
  expected_onprem_vpc_cidr       = var.expected_onprem_vpc_cidr
  tags                           = local.common_tags
  ssm_endpoint_security_group_id = module.security.ssm_endpoint_security_group_id
}

module "security" {
  source = "../../modules/security"

  project_name            = var.project_name
  environment             = var.environment
  service_vpc_id          = module.existing_network.service_vpc_id
  service_vpc_cidr_block  = module.existing_network.service_vpc_cidr_block
  onprem_vpc_id           = module.onprem_network.onprem_vpc_id
  allowed_alb_cidr_blocks = var.allowed_alb_cidr_blocks
  allowed_vpn_cidr_blocks = var.allowed_vpn_cidr_blocks
  backend_container_port  = var.backend_container_port
  fastapi_port            = var.fastapi_port
  postgres_port           = var.postgres_port
  tags                    = local.common_tags
  cluster_name            = var.cluster_name
}

module "service_nat_gateway" {
  source = "../../modules/service-nat-gateway"

  project_name                        = var.project_name
  environment                         = var.environment
  service_public_subnet_id_for_nat    = module.existing_network.public_subnet_ids[0]
  service_private_app_route_table_ids = module.existing_network.private_app_route_table_ids
  create_service_nat_gateway          = var.create_service_nat_gateway
  tags                                = local.common_tags
}

module "onprem_compute" {
  source = "../../modules/onprem-compute"

  project_name                      = var.project_name
  environment                       = var.environment
  ami_id                            = var.onprem_ami_id
  instance_type                     = var.onprem_instance_type
  strongswan_instance_type          = var.strongswan_instance_type
  onprem_ec2_key_name               = var.onprem_ec2_key_name
  onprem_public_subnet_id           = module.onprem_network.onprem_public_subnet_id
  onprem_private_subnet_id          = module.onprem_network.onprem_private_subnet_id
  strongswan_security_group_id      = module.security.strongswan_security_group_id
  fastapi_security_group_id         = module.security.fastapi_security_group_id
  onprem_postgres_security_group_id = module.security.onprem_postgres_security_group_id
  strongswan_private_ip             = var.strongswan_private_ip
  fastapi_private_ip                = var.fastapi_private_ip
  onprem_postgres_private_ip        = var.onprem_postgres_private_ip
  fastapi_port                      = var.fastapi_port
  postgres_port                     = var.postgres_port
  root_volume_size                  = var.onprem_root_volume_size
  tags                              = local.common_tags
}

module "vpn" {
  source = "../../modules/vpn"

  project_name                        = var.project_name
  environment                         = var.environment
  service_vpc_id                      = module.existing_network.service_vpc_id
  service_vpc_cidr_block              = module.existing_network.service_vpc_cidr_block
  onprem_vpc_cidr_block               = module.onprem_network.onprem_vpc_cidr_block
  service_private_app_route_table_ids = module.existing_network.private_app_route_table_ids
  onprem_private_route_table_id       = module.onprem_network.onprem_private_route_table_id
  strongswan_public_ip                = module.onprem_compute.strongswan_public_ip
  strongswan_network_interface_id     = module.onprem_compute.strongswan_network_interface_id
  customer_gateway_bgp_asn            = var.customer_gateway_bgp_asn
  tags                                = local.common_tags
}

module "rds" {
  source = "../../modules/rds"

  db_password             = var.db_password
  project_name            = var.project_name
  environment             = var.environment
  private_data_subnet_ids = module.existing_network.private_data_subnet_ids
  rds_security_group_id   = module.security.rds_security_group_id
  engine_version          = var.rds_engine_version
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  max_allocated_storage   = var.rds_max_allocated_storage
  db_name                 = var.rds_db_name
  username                = var.rds_username
  multi_az                = var.rds_multi_az
  backup_retention_period = var.rds_backup_retention_period
  deletion_protection     = var.rds_deletion_protection
  skip_final_snapshot     = var.rds_skip_final_snapshot
  tags                    = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  authentication_mode = "API_AND_CONFIG_MAP"

  project_name                    = var.project_name
  environment                     = var.environment
  private_app_subnet_ids          = module.existing_network.private_app_subnet_ids
  public_subnet_ids               = module.existing_network.public_subnet_ids
  eks_node_security_group_id      = module.security.eks_node_security_group_id
  cluster_version                 = var.eks_cluster_version
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_endpoint_private_access = var.cluster_endpoint_private_access
  cluster_public_access_cidrs     = var.cluster_public_access_cidrs
  node_instance_types             = var.eks_node_instance_types
  node_disk_size                  = var.eks_node_disk_size
  node_desired_size               = var.eks_node_desired_size
  node_min_size                   = var.eks_node_min_size
  node_max_size                   = var.eks_node_max_size
  tags                            = local.common_tags

  depends_on = [
    module.service_nat_gateway
  ]
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_eks_cluster" {
  security_group_id            = module.security.rds_security_group_id
  referenced_security_group_id = module.eks.eks_cluster_security_group_id
  from_port                    = var.postgres_port
  to_port                      = var.postgres_port
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from EKS managed node group cluster security group."

  tags = local.common_tags
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_bastion" {
  security_group_id            = module.security.rds_security_group_id
  referenced_security_group_id = module.security.bastion_security_group_id

  from_port   = var.postgres_port
  to_port     = var.postgres_port
  ip_protocol = "tcp"

  description = "PostgreSQL from Bastion"

  tags = local.common_tags
}

module "app_services" {
  source = "../../modules/app-services"

  project_name                      = var.project_name
  environment                       = var.environment
  app_ecr_repository_names          = var.app_ecr_repository_names
  ecr_force_delete                  = var.ecr_force_delete
  reports_bucket_name               = var.reports_bucket_name
  reports_s3_prefix                 = var.reports_s3_prefix
  board_images_bucket_name          = var.board_images_bucket_name
  board_images_s3_prefix            = var.board_images_s3_prefix
  reports_bucket_force_destroy      = var.reports_bucket_force_destroy
  cloudwatch_log_retention_days     = var.cloudwatch_log_retention_days
  eks_oidc_provider_arn             = module.eks.eks_oidc_provider_arn
  eks_oidc_issuer_url               = module.eks.eks_oidc_issuer_url
  backend_service_account_namespace = var.backend_service_account_namespace
  backend_service_account_name      = var.backend_service_account_name
  create_ai_processor_lambda        = var.create_ai_processor_lambda
  ai_processor_image_uri            = var.ai_processor_image_uri
  tags                              = local.common_tags
}

module "cicd" {
  count  = var.enable_cicd ? 1 : 0
  source = "../../modules/cicd"

  project_name                  = var.project_name
  environment                   = var.environment
  create_github_oidc_provider   = var.create_github_oidc_provider
  github_oidc_provider_arn      = var.github_oidc_provider_arn
  github_repository             = var.github_repository
  github_branch                 = var.github_branch
  create_github_ecr_push_role   = var.create_github_ecr_push_role
  create_github_eks_deploy_role = var.create_github_eks_deploy_role
  create_terraform_apply_role   = var.create_terraform_apply_role
  tags                          = local.common_tags
}

module "bastion" {
  source = "../../modules/bastion"

  project_name = var.project_name
  environment  = var.environment

  public_subnet_id = module.existing_network.public_subnet_ids[0]

  bastion_security_group_id = module.security.bastion_security_group_id

  key_name = var.bastion_key_name

  tags = local.common_tags
}


# jiyun
resource "aws_eks_access_entry" "jiyun" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/jiyun"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "jiyun_admin" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/jiyun"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# donghee
resource "aws_eks_access_entry" "donghee" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/donghee"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "donghee_admin" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/donghee"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# jiwon
resource "aws_eks_access_entry" "jiwon" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/jiwon"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "jiwon_admin" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/jiwon"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# hyeongwook
resource "aws_eks_access_entry" "hyeongwook" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/hyeongwook"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "hyeongwook_admin" {
  cluster_name  = module.eks.eks_cluster_name
  principal_arn = "arn:aws:iam::105959916837:user/hyeongwook"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

module "helm" {
  source     = "../../modules/helm"
  depends_on = [module.eks]
}

module "k8s" {
  source = "../../modules/k8s"

  app_namespace       = var.backend_service_account_namespace
  kakao_rest_api_key  = var.kakao_rest_api_key
  kakao_js_api_key    = var.kakao_js_api_key
  google_maps_api_key = var.google_maps_api_key

  depends_on = [
    module.eks,
    module.helm
  ]
}

module "karpenter" {
  source = "../../modules/karpenter"
  count  = var.enable_karpenter ? 1 : 0

  cluster_name          = var.cluster_name
  eks_oidc_provider_arn = module.eks.eks_oidc_provider_arn
  eks_oidc_issuer_url   = module.eks.eks_oidc_issuer_url
  eks_node_role_name    = module.eks.eks_node_role_name

  tags = local.common_tags
}

resource "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_acm_certificate" "frontend" {
  domain_name = var.domain_name

  subject_alternative_names = [
    for domain_name in local.frontend_domain_names : domain_name
    if domain_name != var.domain_name
  ]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-frontend-certificate"
  })
}

resource "aws_route53_record" "frontend_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.frontend.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn = aws_acm_certificate.frontend.arn

  validation_record_fqdns = [
    for record in aws_route53_record.frontend_certificate_validation : record.fqdn
  ]
}

resource "aws_route53_record" "frontend_alias" {
  for_each = (
    var.frontend_alb_dns_name != "" && var.frontend_alb_zone_id != ""
    ? toset(local.frontend_domain_names)
    : toset([])
  )

  name    = each.value
  type    = "A"
  zone_id = aws_route53_zone.main.zone_id

  alias {
    name                   = var.frontend_alb_dns_name
    zone_id                = var.frontend_alb_zone_id
    evaluate_target_health = true
  }
}
