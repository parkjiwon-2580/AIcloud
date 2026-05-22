variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "service_public_subnet_id_for_nat" {
  description = "Existing Service public subnet ID where the NAT Gateway is created."
  type        = string
}

variable "service_private_app_route_table_ids" {
  description = "Existing Service private app route table IDs for the subnets where EKS worker nodes are actually placed. These receive 0.0.0.0/0 -> NAT Gateway."
  type        = list(string)
}

variable "create_service_nat_gateway" {
  description = "Whether to create the Service NAT Gateway for private app subnet egress."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
