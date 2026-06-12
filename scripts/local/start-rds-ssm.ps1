aws ssm start-session `
  --region ap-northeast-2 `
  --target i-0c6b4cfb640b80252 `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host="ai-care-dev-postgres.czeumgqsmwh8.ap-northeast-2.rds.amazonaws.com",portNumber="5432",localPortNumber="15432"
