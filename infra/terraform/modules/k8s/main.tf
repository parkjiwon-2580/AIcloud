resource "kubernetes_secret_v1" "hospital_recommendation_service" {
  metadata {
    name      = var.hospital_recommendation_secret_name
    namespace = var.app_namespace
  }

  data = merge(
    {
      MAP_API_KEY = var.kakao_rest_api_key
    },
    var.kakao_js_api_key != "" ? {
      KAKAO_JS_API_KEY = var.kakao_js_api_key
    } : {}
  )

  type = "Opaque"
}
