resource "kubernetes_secret_v1" "hospital_recommendation_service" {
  metadata {
    name      = var.hospital_recommendation_secret_name
    namespace = var.app_namespace
  }

  data = merge(
    var.kakao_rest_api_key != "" ? {
      MAP_API_KEY = var.kakao_rest_api_key
    } : {},
    var.kakao_js_api_key != "" ? {
      KAKAO_JS_API_KEY = var.kakao_js_api_key
    } : {},
    var.google_maps_api_key != "" ? {
      GOOGLE_MAPS_API_KEY = var.google_maps_api_key
    } : {}
  )

  type = "Opaque"

  lifecycle {
    ignore_changes = [data]
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "nginx_hpa" {
  metadata {
    name = "nginx-hpa"
  }

  spec {
    min_replicas = 1
    max_replicas = 5

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.nginx.metadata[0].name
    }

    metric {
      type = "Resource"

      resource {
        name = "cpu"

        target {
          type                = "Utilization"
          average_utilization = 50
        }
      }
    }
  }
}

resource "kubernetes_deployment" "nginx" {
  metadata {
    name = "nginx"

    labels = {
      app = "nginx"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx"

          port {
            container_port = 80
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }

            limits = {
              cpu    = "500m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}
