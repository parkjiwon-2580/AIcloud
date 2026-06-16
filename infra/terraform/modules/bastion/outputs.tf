output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "bastion_instance_id" {
  value = aws_instance.bastion.id
}

output "bastion_private_ip" {
  value = aws_instance.bastion.private_ip
}

output "bastion_public_dns" {
  value = aws_instance.bastion.public_dns
}

output "bastion_iam_instance_profile_name" {
  value = aws_iam_instance_profile.bastion_ssm_profile.name
}

output "bastion_iam_role_name" {
  value = aws_iam_role.bastion_ssm_role.name
}
