provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

provider "helm" {
  kubernetes {
    host = module.eks.eks_cluster_endpoint

    cluster_ca_certificate = base64decode(
      module.eks.eks_cluster_certificate_authority_data
    )

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"

      command = "aws"

      args = [
        "eks",
        "get-token",
        "--cluster-name",
        "ai-care-dev-eks",
        "--region",
        "ap-northeast-2"
      ]
    }
  }
}

provider "kubernetes" {
  host = module.eks.eks_cluster_endpoint

  cluster_ca_certificate = base64decode(
    module.eks.eks_cluster_certificate_authority_data
  )

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"

    command = "aws"

    args = [
      "eks",
      "get-token",
      "--cluster-name",
      "ai-care-dev-eks",
      "--region",
      "ap-northeast-2"
    ]
  }
}



