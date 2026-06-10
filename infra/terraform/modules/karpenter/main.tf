resource "aws_sqs_queue" "karpenter" {
  name = "${var.cluster_name}-karpenter"

  tags = var.tags
}

data "aws_iam_policy_document" "karpenter_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type = "Federated"

      identifiers = [
        var.eks_oidc_provider_arn
      ]
    }

    condition {
      test = "StringEquals"

       variable = "${replace(
        var.eks_oidc_issuer_url,
        "https://",
        ""
        )}:sub"


      values = [
        "system:serviceaccount:karpenter:karpenter"
      ]
    }
  }
}

resource "aws_iam_role" "karpenter_controller" {
  name = "${var.cluster_name}-karpenter-controller"

  assume_role_policy = data.aws_iam_policy_document.karpenter_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "karpenter_controller_policy" {
  role = aws_iam_role.karpenter_controller.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

resource "null_resource" "karpenter_install" {
  provisioner "local-exec" {
    command = "helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter --namespace karpenter --create-namespace --set settings.clusterName=${var.cluster_name} --set settings.interruptionQueue=${aws_sqs_queue.karpenter.name} --set-string serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn=${aws_iam_role.karpenter_controller.arn}"
  }

  depends_on = [
    aws_iam_role.karpenter_controller,
    aws_sqs_queue.karpenter
  ]
}

resource "aws_iam_role_policy" "karpenter_controller_inline" {
  name = "${var.cluster_name}-karpenter-inline"

  role = aws_iam_role.karpenter_controller.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "eks:DescribeCluster"
        ]

        Resource = "*"
      }
    ]
  })
}