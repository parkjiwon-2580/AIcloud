data "aws_ami" "ubuntu_2204" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}-onprem"
  ami_id      = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu_2204[0].id
  key_name    = var.onprem_ec2_key_name != "" ? var.onprem_ec2_key_name : null
}

# =========================================================
# SSM IAM Role
# =========================================================

resource "aws_iam_role" "onprem_ssm_role" {
  name = "${local.name_prefix}-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "onprem_ssm_core" {
  role       = aws_iam_role.onprem_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "onprem_ecr_readonly" {
  role = aws_iam_role.onprem_ssm_role.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "onprem_ssm_profile" {
  name = "${local.name_prefix}-ssm-profile"
  role = aws_iam_role.onprem_ssm_role.name
}

# =========================================================
# strongSwan
# =========================================================

resource "aws_instance" "strongswan" {
  ami                         = local.ami_id
  instance_type               = var.strongswan_instance_type
  subnet_id                   = var.onprem_public_subnet_id
  private_ip                  = var.strongswan_private_ip
  associate_public_ip_address = false
  source_dest_check           = false

  vpc_security_group_ids = [
    var.strongswan_security_group_id
  ]

  key_name = local.key_name

  iam_instance_profile = aws_iam_instance_profile.onprem_ssm_profile.name

  user_data = templatefile("${path.module}/user_data/strongswan.sh.tpl", {
    service_vpc_cidr_note = "10.0.0.0/16"
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = var.root_volume_size
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-strongswan"
    Role = "strongswan"
  })
}

resource "aws_eip" "strongswan" {
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-strongswan-eip"
  })
}

resource "aws_eip_association" "strongswan" {
  allocation_id = aws_eip.strongswan.id
  instance_id   = aws_instance.strongswan.id
}

# =========================================================
# FastAPI Placeholder
# =========================================================

resource "aws_instance" "fastapi" {
  ami                         = local.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.onprem_private_subnet_id
  private_ip                  = var.fastapi_private_ip
  associate_public_ip_address = false
  source_dest_check           = true

  vpc_security_group_ids = [
    var.fastapi_security_group_id
  ]

  key_name = local.key_name

  iam_instance_profile = aws_iam_instance_profile.onprem_ssm_profile.name

  user_data = templatefile("${path.module}/user_data/fastapi.sh.tpl", {
    fastapi_port = var.fastapi_port
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = var.root_volume_size
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-fastapi-placeholder"
    Role = "fastapi-placeholder"
  })
}

# =========================================================
# PostgreSQL Placeholder
# =========================================================

resource "aws_instance" "onprem_postgres" {
  ami                         = local.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.onprem_private_subnet_id
  private_ip                  = var.onprem_postgres_private_ip
  associate_public_ip_address = false
  source_dest_check           = true

  vpc_security_group_ids = [
    var.onprem_postgres_security_group_id
  ]

  key_name = local.key_name

  iam_instance_profile = aws_iam_instance_profile.onprem_ssm_profile.name

  user_data = templatefile("${path.module}/user_data/postgres.sh.tpl", {
    postgres_port = var.postgres_port
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = var.root_volume_size
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-postgres-placeholder"
    Role = "postgres-placeholder"
  })
}
