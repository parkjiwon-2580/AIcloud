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

variable "onprem_vpc_cidr_block" {
  description = "On-Prem Role VPC CIDR block."
  type        = string
}

variable "service_private_app_route_table_ids" {
  description = "Existing Service private app route table IDs that should route On-Prem CIDR to the VGW."
  type        = list(string)
}

variable "onprem_private_route_table_id" {
  description = "On-Prem private route table ID."
  type        = string
}

variable "strongswan_public_ip" {
  description = "strongSwan Elastic IP public address."
  type        = string
}

variable "strongswan_network_interface_id" {
  description = "strongSwan primary network interface ID."
  type        = string
}

variable "customer_gateway_bgp_asn" {
  description = "BGP ASN for the customer gateway. Static routing is used, but AWS still requires an ASN."
  type        = number
  default     = 65000
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
