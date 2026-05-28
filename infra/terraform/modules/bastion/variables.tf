variable "project_name" {}
variable "environment" {}

variable "public_subnet_id" {}

variable "bastion_security_group_id" {}

variable "key_name" {}

variable "tags" {
  type = map(string)
}