data "aws_ami" "amazon_linux" {
  most_recent = true

  owners = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.small"

  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.bastion_security_group_id]

  associate_public_ip_address = true

  key_name = var.key_name

  iam_instance_profile = aws_iam_instance_profile.bastion_ssm_profile.name

   user_data = <<-EOF
   #!/bin/bash
   yum install -y amazon-ssm-agent
   systemctl enable amazon-ssm-agent
   systemctl start amazon-ssm-agent
   EOF

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-bastion"
  })
}

resource "aws_iam_role" "bastion_ssm_role" {
  name = "${local.name_prefix}-bastion-ssm-role"

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

resource "aws_iam_role_policy_attachment" "bastion_ssm_core" {
  role       = aws_iam_role.bastion_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion_ssm_profile" {
  name = "${local.name_prefix}-bastion-ssm-profile"
  role = aws_iam_role.bastion_ssm_role.name
}