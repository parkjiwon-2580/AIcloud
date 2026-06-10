variable "cluster_name" {
  type = string
}

variable "eks_oidc_provider_arn" {
  type = string
}

variable "eks_oidc_issuer_url" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "eks_node_role_name" {
  type = string
}