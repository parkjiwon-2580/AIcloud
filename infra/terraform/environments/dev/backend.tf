terraform {
  backend "s3" {
    bucket = "ai-care-terraform-state-105959916837-ap-northeast-2-an"
    key    = "dev/terraform.tfstate"
    region = "ap-northeast-2"

    encrypt = true
  }
}