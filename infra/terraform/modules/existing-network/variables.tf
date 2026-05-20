variable "service_vpc_id" {
  description = "Existing Service VPC ID created outside Terraform."
  type        = string
}

variable "service_public_subnet_ids" {
  description = "Existing public subnet IDs in the Service VPC."
  type        = list(string)
}

variable "service_private_app_subnet_ids" {
  description = "Existing private application subnet IDs in the Service VPC."
  type        = list(string)
}

variable "service_private_data_subnet_ids" {
  description = "Existing private data subnet IDs in the Service VPC."
  type        = list(string)
}

variable "service_internet_gateway_id" {
  description = "Existing Service VPC Internet Gateway ID. This must be attached to the Service VPC."
  type        = string
}

variable "service_public_route_table_ids" {
  description = "Existing Service public route table IDs. Their 0.0.0.0/0 -> Service IGW route is console-managed."
  type        = list(string)
}

variable "service_private_app_route_table_ids" {
  description = "Existing Service private app route table IDs for the subnets where EKS worker nodes are actually placed. Terraform adds NAT and VGW routes to these route tables."
  type        = list(string)
}

variable "service_private_data_route_table_ids" {
  description = "Existing Service private data route table IDs. Terraform does not add NAT or VPN routes to these by default."
  type        = list(string)
  default     = []
}

variable "expected_service_vpc_cidr" {
  description = "Expected CIDR block for the existing Service VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "tags" {
  description = "Common tags. This module only reads existing network resources."
  type        = map(string)
  default     = {}
}
