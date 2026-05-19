#!/bin/bash
set -euo pipefail

dnf update -y

cat >/etc/motd <<EOF
AI Care On-Prem PostgreSQL placeholder

Expected placeholder port: ${postgres_port}
The actual PostgreSQL service and credentials are intentionally not configured in infra-only apply.
EOF
