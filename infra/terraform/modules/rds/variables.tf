variable "project_name" {
  description = "Project name used in resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "private_data_subnet_ids" {
  description = "Existing private data subnet IDs for RDS."
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "RDS security group ID."
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "17.9"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GiB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage autoscaling limit in GiB."
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "aicare"
}

variable "username" {
  description = "RDS master username. Password is managed by AWS Secrets Manager."
  type        = string
  default     = "dbadmin"
}

variable "multi_az" {
  description = "Whether to enable Multi-AZ RDS."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "RDS backup retention period in days."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "RDS deletion protection."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Whether to skip final snapshot on destroy."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
