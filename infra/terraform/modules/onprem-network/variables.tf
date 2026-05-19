variable "onprem_vpc_id" {
  description = "Existing On-Prem VPC ID."
  type        = string
}

variable "onprem_public_subnet_id" {
  description = "Existing On-Prem public subnet ID for strongSwan."
  type        = string
}

variable "onprem_private_subnet_id" {
  description = "Existing On-Prem private subnet ID for placeholder services."
  type        = string
}

variable "onprem_internet_gateway_id" {
  description = "Existing On-Prem VPC Internet Gateway ID. Do not use the Service VPC IGW here."
  type        = string
}

variable "onprem_public_route_table_id" {
  description = "Existing On-Prem public route table ID. Its 0.0.0.0/0 -> On-Prem IGW route is console-managed."
  type        = string
}

variable "onprem_private_route_table_id" {
  description = "Existing On-Prem private route table ID. Terraform adds the Service CIDR route to strongSwan ENI here."
  type        = string
}

variable "expected_onprem_vpc_cidr" {
  description = "Expected CIDR block for the existing On-Prem VPC."
  type        = string
  default     = "172.16.0.0/16"
}

variable "tags" {
  description = "Common tags. This module only reads existing network resources."
  type        = map(string)
  default     = {}
}
