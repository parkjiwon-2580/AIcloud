#!/bin/bash
set -euo pipefail

dnf update -y

cat >/etc/motd <<EOF
AI Care On-Prem FastAPI placeholder

Expected placeholder port: ${fastapi_port}
The actual FastAPI application is intentionally not installed in infra-only apply.
EOF
