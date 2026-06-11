aws ssm start-session `
  --region ap-northeast-2 `
  --target i-08e163af4b7a4d609 `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host="172.16.10.20",portNumber="5432",localPortNumber="12321"
