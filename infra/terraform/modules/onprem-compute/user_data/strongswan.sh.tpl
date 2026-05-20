#!/bin/bash
set -euo pipefail

dnf update -y
dnf install -y strongswan

cat >/etc/sysctl.d/99-aicare-ip-forward.conf <<'EOF'
net.ipv4.ip_forward = 1
EOF
sysctl --system

cat >/etc/motd <<'EOF'
AI Care strongSwan placeholder

This instance is created for the infra-only Site-to-Site VPN skeleton.
IP forwarding is enabled, but real IPsec tunnel configuration is intentionally TODO.
Do not place VPN PSK or other secrets in user data or Terraform code.
EOF

systemctl enable strongswan || true

# TODO: Configure strongSwan IPsec tunnels after reading AWS VPN tunnel parameters.
# Note: Terraform state can contain sensitive tunnel configuration if exposed directly.
