variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "private_app_subnet_ids" {
  description = "Existing private application subnet IDs for EKS worker nodes."
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Existing public subnet IDs. Only tagged for future ALB discovery."
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "EKS node security group ID."
  type        = string
}

variable "cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.34"
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS public endpoint is enabled."
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Whether the EKS private endpoint is enabled."
  type        = bool
  default     = true
}

variable "cluster_public_access_cidrs" {
  description = "CIDR blocks allowed to access the EKS public endpoint."
  type        = list(string)
}

variable "node_instance_types" {
  description = "Managed node group instance types."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_disk_size" {
  description = "Managed node group root volume size in GiB. Managed directly by aws_eks_node_group because no custom launch template is used."
  type        = number
  default     = 20
}

variable "node_desired_size" {
  description = "Desired node group size."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum node group size."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum node group size."
  type        = number
  default     = 3
}

variable "eks_addon_names" {
  description = "EKS add-ons to install."
  type        = list(string)
  default     = ["vpc-cni", "kube-proxy", "coredns"]
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
