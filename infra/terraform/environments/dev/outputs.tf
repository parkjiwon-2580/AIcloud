output "service_vpc_id" {
  description = "Existing Service VPC ID."
  value       = module.existing_network.service_vpc_id
}

output "onprem_vpc_id" {
  description = "On-Prem Role VPC ID."
  value       = module.onprem_network.onprem_vpc_id
}

output "security_group_ids" {
  description = "Created security group IDs."
  value = {
    alb             = module.security.alb_security_group_id
    eks_node        = module.security.eks_node_security_group_id
    rds             = module.security.rds_security_group_id
    strongswan      = module.security.strongswan_security_group_id
    fastapi         = module.security.fastapi_security_group_id
    onprem_postgres = module.security.onprem_postgres_security_group_id
  }
}

output "onprem_compute" {
  description = "On-Prem placeholder compute outputs."
  value = {
    strongswan_instance_id          = module.onprem_compute.strongswan_instance_id
    strongswan_private_ip           = module.onprem_compute.strongswan_private_ip
    strongswan_public_ip            = module.onprem_compute.strongswan_public_ip
    strongswan_eip_allocation_id    = module.onprem_compute.strongswan_eip_allocation_id
    strongswan_network_interface_id = module.onprem_compute.strongswan_network_interface_id
    fastapi_instance_id             = module.onprem_compute.fastapi_instance_id
    fastapi_private_ip              = module.onprem_compute.fastapi_private_ip
    onprem_postgres_instance_id     = module.onprem_compute.onprem_postgres_instance_id
    onprem_postgres_private_ip      = module.onprem_compute.onprem_postgres_private_ip
  }
}

output "vpn" {
  description = "VPN outputs excluding sensitive customer gateway configuration."
  value = {
    vpn_gateway_id                     = module.vpn.vpn_gateway_id
    customer_gateway_id                = module.vpn.customer_gateway_id
    vpn_connection_id                  = module.vpn.vpn_connection_id
    vpn_connection_tunnel1_address     = module.vpn.vpn_connection_tunnel1_address
    vpn_connection_tunnel2_address     = module.vpn.vpn_connection_tunnel2_address
    vpn_connection_tunnel1_inside_cidr = module.vpn.vpn_connection_tunnel1_inside_cidr
    vpn_connection_tunnel2_inside_cidr = module.vpn.vpn_connection_tunnel2_inside_cidr
    service_to_onprem_route_table_ids  = module.vpn.service_to_onprem_route_table_ids
    onprem_to_service_route_table_id   = module.vpn.onprem_to_service_route_table_id
  }
}

output "rds" {
  description = "RDS outputs without DATABASE_URL."
  value = {
    rds_instance_id       = module.rds.rds_instance_id
    rds_instance_arn      = module.rds.rds_instance_arn
    rds_endpoint          = module.rds.rds_endpoint
    rds_address           = module.rds.rds_address
    rds_port              = module.rds.rds_port
    rds_db_name           = module.rds.rds_db_name
    rds_username          = module.rds.rds_username
    rds_subnet_group_name = module.rds.rds_subnet_group_name
  }
}

output "rds_master_user_secret_arn" {
  description = "AWS Secrets Manager secret ARN for the RDS master user."
  value       = module.rds.rds_master_user_secret_arn
  sensitive   = true
}

output "service_nat_gateway" {
  description = "Service NAT Gateway for private EKS node egress."
  value = {
    service_nat_gateway_id                  = module.service_nat_gateway.service_nat_gateway_id
    service_nat_gateway_public_ip           = module.service_nat_gateway.service_nat_gateway_public_ip
    service_nat_gateway_eip_allocation_id   = module.service_nat_gateway.service_nat_gateway_eip_allocation_id
    service_nat_gateway_subnet_id           = module.service_nat_gateway.service_nat_gateway_subnet_id
    service_nat_route_table_ids             = module.service_nat_gateway.service_nat_route_table_ids
    service_private_app_nat_route_table_ids = module.service_nat_gateway.service_private_app_nat_route_table_ids
  }
}

output "eks" {
  description = "EKS outputs."
  value = {
    eks_cluster_id                = module.eks.eks_cluster_id
    eks_cluster_name              = module.eks.eks_cluster_name
    eks_cluster_arn               = module.eks.eks_cluster_arn
    eks_cluster_endpoint          = module.eks.eks_cluster_endpoint
    eks_cluster_security_group_id = module.eks.eks_cluster_security_group_id
    eks_node_group_name           = module.eks.eks_node_group_name
    eks_node_group_arn            = module.eks.eks_node_group_arn
    eks_node_role_arn             = module.eks.eks_node_role_arn
    eks_cluster_role_arn          = module.eks.eks_cluster_role_arn
    eks_oidc_issuer_url           = module.eks.eks_oidc_issuer_url
    eks_oidc_provider_arn         = module.eks.eks_oidc_provider_arn
    eks_update_kubeconfig_command = module.eks.eks_update_kubeconfig_command
  }
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data."
  value       = module.eks.eks_cluster_certificate_authority_data
}

output "app_services" {
  description = "Application support service outputs."
  value = {
    ecr_repository_urls         = module.app_services.ecr_repository_urls
    ecr_repository_arns         = module.app_services.ecr_repository_arns
    triage_queue_arn            = module.app_services.triage_queue_arn
    triage_queue_url            = module.app_services.triage_queue_url
    triage_dlq_arn              = module.app_services.triage_dlq_arn
    triage_dlq_url              = module.app_services.triage_dlq_url
    reports_bucket_name         = module.app_services.reports_bucket_name
    reports_bucket_arn          = module.app_services.reports_bucket_arn
    reports_s3_prefix           = module.app_services.reports_s3_prefix
    cloudfront_distribution_id  = module.app_services.cloudfront_distribution_id
    cloudfront_domain_name      = module.app_services.cloudfront_domain_name
    backend_log_group_name      = module.app_services.backend_log_group_name
    ai_processor_log_group_name = module.app_services.ai_processor_log_group_name
    backend_irsa_role_arn       = module.app_services.backend_irsa_role_arn
    backend_irsa_policy_arn     = module.app_services.backend_irsa_policy_arn
    ai_processor_role_arn       = module.app_services.ai_processor_role_arn
    ai_processor_policy_arn     = module.app_services.ai_processor_policy_arn
  }
}

output "cicd" {
  description = "CI/CD placeholder outputs. Null when enable_cicd=false."
  value = {
    github_oidc_provider_arn   = var.enable_cicd ? module.cicd[0].github_oidc_provider_arn : null
    github_ecr_push_role_arn   = var.enable_cicd ? module.cicd[0].github_ecr_push_role_arn : null
    github_eks_deploy_role_arn = var.enable_cicd ? module.cicd[0].github_eks_deploy_role_arn : null
    terraform_apply_role_arn   = var.enable_cicd ? module.cicd[0].terraform_apply_role_arn : null
  }
}
