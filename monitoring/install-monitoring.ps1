aws eks update-kubeconfig --region ap-northeast-2 --name ai-care-dev-eks

Write-Host "Creating monitoring namespace..."

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

Write-Host "Adding Helm repository..."

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm repo update

Write-Host "Installing kube-prometheus-stack..."

helm upgrade --install prometheus `
prometheus-community/kube-prometheus-stack `
-n monitoring `
-f monitoring/values.yaml

Write-Host "Installation completed."

# kubectl apply -f monitoring/servicemonitors/