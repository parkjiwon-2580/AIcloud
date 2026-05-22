variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "ami_id" {
  description = "Optional AMI ID. When empty, the latest Amazon Linux 2023 x86_64 AMI is used."
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type for On-Prem placeholders."
  type        = string
  default     = "t3.micro"
}

variable "strongswan_instance_type" {
  description = "EC2 instance type for strongSwan."
  type        = string
  default     = "t3.micro"
}

variable "onprem_ec2_key_name" {
  description = "Optional EC2 key pair name. SSH is not opened by security groups."
  type        = string
  default     = ""
}

variable "onprem_public_subnet_id" {
  description = "On-Prem public subnet ID."
  type        = string
}

variable "onprem_private_subnet_id" {
  description = "On-Prem private subnet ID."
  type        = string
}

variable "strongswan_security_group_id" {
  description = "strongSwan security group ID."
  type        = string
}

variable "fastapi_security_group_id" {
  description = "FastAPI placeholder security group ID."
  type        = string
}

variable "onprem_postgres_security_group_id" {
  description = "On-Prem PostgreSQL placeholder security group ID."
  type        = string
}

variable "strongswan_private_ip" {
  description = "Fixed private IP for strongSwan."
  type        = string
}

variable "fastapi_private_ip" {
  description = "Fixed private IP for the FastAPI placeholder."
  type        = string
}

variable "onprem_postgres_private_ip" {
  description = "Fixed private IP for the On-Prem PostgreSQL placeholder."
  type        = string
}

variable "fastapi_port" {
  description = "FastAPI placeholder port."
  type        = number
}

variable "postgres_port" {
  description = "PostgreSQL placeholder port."
  type        = number
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 20
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
