variable "app_namespace" {
  description = "Kubernetes namespace where application workloads are deployed."
  type        = string
  default     = "service"
}

variable "hospital_recommendation_secret_name" {
  description = "Kubernetes Secret name consumed by hospital-recommendation-service."
  type        = string
  default     = "hospital-recommendation-service-secret"
}

variable "kakao_rest_api_key" {
  description = "Kakao REST API key used by hospital-recommendation-service for local search."
  type        = string
  sensitive   = true
  default     = ""
}

variable "kakao_js_api_key" {
  description = "Kakao JavaScript API key for frontend map SDK usage."
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API key used by hospital-recommendation-service for optional opening-hours enrichment."
  type        = string
  sensitive   = true
  default     = ""
}
