Copy-Item .env .env.local.backup -Force
Copy-Item .env.aws-ssm.example .env -Force
Write-Host "Copied .env.aws-ssm.example to .env. Previous .env saved as .env.local.backup."
