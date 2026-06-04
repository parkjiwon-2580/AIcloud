helm install postgres-exporter `
prometheus-community/prometheus-postgres-exporter `
-n monitoring `
-f monitoring/postgres-values.yaml
