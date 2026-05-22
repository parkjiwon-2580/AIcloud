variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "service_vpc_id" {
  description = "Existing Service VPC ID."
  type        = string
}

variable "service_vpc_cidr_block" {
  description = "Existing Service VPC CIDR block."
  type        = string
}

variable "onprem_vpc_id" {
  description = "On-Prem Role VPC ID."
  type        = string
}

variable "allowed_alb_cidr_blocks" {
  description = "CIDR blocks allowed to access the future ALB security group."
  type        = list(string)
}

variable "allowed_vpn_cidr_blocks" {
  description = "CIDR blocks allowed to initiate IPsec traffic to strongSwan."
  type        = list(string)
}

variable "backend_container_port" {
  description = "Backend container port allowed from the future ALB security group to EKS nodes."
  type        = number
}

variable "fastapi_port" {
  description = "On-Prem FastAPI placeholder port."
  type        = number
}

variable "postgres_port" {
  description = "PostgreSQL port."
  type        = number
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
