// Project guide: step-by-step checklist (rendered in the "🛠 Project guide" view).
window.PROJECT = {
title: "Full observability stack: Prometheus + Grafana + Alertmanager + Loki",
intro: "Ithu un portfolio project kutty. Laptop laye docker compose vechu metrics, logs, alerts, dashboards, SLO ellaam build pannu. Ovvoru step mudinjadhum ✔ tick pannu. Lesson 18 la Malli Akka ithe project ah explain pannuvaanga.",
steps: [
{t:"1. Folder structure", d:"Oru repo, ellaa configs um Git la.",
 c:`observability-stack/
  app/            app.py, requirements.txt, Dockerfile
  prometheus/     prometheus.yml, rules/alerts.yml, rules/recording.yml
  alertmanager/   alertmanager.yml
  grafana/        provisioning/datasources/*.yml, provisioning/dashboards/*.yml, dashboards/*.json
  alloy/          config.alloy
  docker-compose.yml
  README.md`},
{t:"2. Instrumented app", d:"Python Flask app: counter, histogram, JSON logs, /fail endpoint errors ku.",
 c:`# app/app.py
import json, logging, random, time
from flask import Flask
from prometheus_client import Counter, Histogram, start_http_server

app = Flask(__name__)
REQS = Counter("http_requests_total", "Requests", ["path", "code"])
LAT = Histogram("http_request_duration_seconds", "Latency", ["path"])
logging.basicConfig(level=logging.INFO, format="%(message)s")

@app.route("/")
def home():
    with LAT.labels("/").time():
        time.sleep(random.uniform(0.01, 0.3))
    REQS.labels("/", "200").inc()
    logging.info(json.dumps({"level": "info", "path": "/", "status": 200}))
    return "ok"

@app.route("/fail")
def fail():
    REQS.labels("/fail", "500").inc()
    logging.error(json.dumps({"level": "error", "path": "/fail", "status": 500, "msg": "db timeout"}))
    return "error", 500

start_http_server(8001)          # /metrics on 8001
app.run(host="0.0.0.0", port=8000)`},
{t:"3. prometheus.yml", d:"app, node_exporter, Prometheus itself scrape pannu. Rules + Alertmanager connect.",
 c:`global: { scrape_interval: 15s, evaluation_interval: 15s }
rule_files: ["/etc/prometheus/rules/*.yml"]
alerting:
  alertmanagers: [{ static_configs: [{ targets: ["alertmanager:9093"] }] }]
scrape_configs:
  - job_name: prometheus
    static_configs: [{ targets: ["localhost:9090"] }]
  - job_name: app
    static_configs: [{ targets: ["app:8001"] }]
  - job_name: node
    static_configs: [{ targets: ["node:9100"] }]`},
{t:"4. Recording rules", d:"Dashboards um alerts um fast ah irukka precompute pannu.",
 c:`# prometheus/rules/recording.yml
groups:
  - name: app-recording
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
      - record: job:http_errors:ratio5m
        expr: sum by (job) (rate(http_requests_total{code=~"5.."}[5m])) / sum by (job) (rate(http_requests_total[5m]))
      - record: job:slo_errors:ratio1h
        expr: sum by (job) (rate(http_requests_total{code=~"5.."}[1h])) / sum by (job) (rate(http_requests_total[1h]))`},
{t:"5. Alert rules", d:"Target down, high error rate, SLO fast burn, disk filling.",
 c:`# prometheus/rules/alerts.yml
groups:
  - name: app-alerts
    rules:
      - alert: TargetDown
        expr: up == 0
        for: 2m
        labels: { severity: critical }
        annotations: { summary: "{{ $labels.job }} on {{ $labels.instance }} is down" }
      - alert: HighErrorRate
        expr: job:http_errors:ratio5m > 0.05
        for: 5m
        labels: { severity: critical }
        annotations: { summary: "Error rate {{ $value | humanizePercentage }}", runbook_url: "https://github.com/<you>/observability-stack/blob/main/RUNBOOK.md" }
      - alert: SLOBurnFast
        expr: job:slo_errors:ratio1h > (14.4 * 0.001)
        for: 2m
        labels: { severity: page }
      - alert: DiskWillFillIn4h
        expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 4 * 3600) < 0
        for: 30m
        labels: { severity: ticket }

promtool check config prometheus/prometheus.yml
promtool check rules prometheus/rules/*.yml`},
{t:"6. Alertmanager ➜ Slack", d:"Slack incoming webhook create pannu. Webhook URL ah Git la podaadhe: .env la vechu, file la reference pannu (illa api_url_file).",
 c:`# alertmanager/alertmanager.yml
route:
  receiver: slack
  group_by: [alertname, job]
  group_wait: 30s
  repeat_interval: 4h
receivers:
  - name: slack
    slack_configs:
      - channel: "#alerts"
        api_url_file: /etc/alertmanager/slack_url    # secret file, git-ignored
        send_resolved: true

amtool check-config alertmanager/alertmanager.yml`},
{t:"7. Logs: Loki + Alloy", d:"Alloy Docker container logs ah Loki ku anuppum.",
 c:`// alloy/config.alloy
discovery.docker "containers" { host = "unix:///var/run/docker.sock" }
loki.source.docker "logs" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.docker.containers.targets
  forward_to = [loki.write.local.receiver]
}
loki.write "local" { endpoint { url = "http://loki:3100/loki/api/v1/push" } }`},
{t:"8. Grafana provisioning", d:"Datasources code la, Grafana start aagum bodhu automatic ah varum.",
 c:`# grafana/provisioning/datasources/ds.yml
apiVersion: 1
datasources:
  - { name: Prometheus, type: prometheus, url: http://prometheus:9090, isDefault: true }
  - { name: Loki, type: loki, url: http://loki:3100 }

# grafana/provisioning/dashboards/default.yml
apiVersion: 1
providers:
  - { name: default, options: { path: /var/lib/grafana/dashboards } }`},
{t:"9. docker-compose.yml", d:"Ellaa services um orey file la.",
 c:`services:
  app:          { build: ./app, ports: ["8000:8000"] }
  node:         { image: quay.io/prometheus/node-exporter:v1.8.2 }
  prometheus:
    image: prom/prometheus:v2.55.1
    ports: ["9090:9090"]
    volumes: ["./prometheus:/etc/prometheus"]
    command: ["--config.file=/etc/prometheus/prometheus.yml", "--web.enable-lifecycle"]
  alertmanager:
    image: prom/alertmanager:v0.27.0
    ports: ["9093:9093"]
    volumes: ["./alertmanager:/etc/alertmanager"]
  loki:         { image: grafana/loki:3.2.1, ports: ["3100:3100"] }
  alloy:
    image: grafana/alloy:v1.4.3
    volumes: ["./alloy:/etc/alloy", "/var/run/docker.sock:/var/run/docker.sock"]
    command: ["run", "/etc/alloy/config.alloy"]
  grafana:
    image: grafana/grafana:11.3.0
    ports: ["3000:3000"]
    volumes: ["./grafana/provisioning:/etc/grafana/provisioning", "./grafana/dashboards:/var/lib/grafana/dashboards"]

docker compose up -d`},
{t:"10. Verify targets", d:"Ellaa targets um UP ah nu paaru.",
 c:`curl -s localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | .labels.job + " " + .health'
# app up / node up / prometheus up`},
{t:"11. RED + USE dashboard", d:"Grafana la dashboard: mela Rate, Errors %, p95 (stat panels), keela trends, adiyila node CPU / memory / disk. Variable: $job. JSON export panni grafana/dashboards la commit pannu.",
 c:`Rate:     sum(rate(http_requests_total{job=~"$job"}[5m]))
Errors %: sum(rate(http_requests_total{job=~"$job",code=~"5.."}[5m])) / sum(rate(http_requests_total{job=~"$job"}[5m])) * 100
p95:      histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job=~"$job"}[5m])))
CPU %:    100 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
Logs:     {container="app"} |= "error"     (Loki panel)`},
{t:"12. Load + failure test", d:"Traffic generate panni, errors create panni, alert fire aagi Slack ku varudhaa nu paaru.",
 c:`hey -z 5m -q 50 http://localhost:8000/ &
for i in $(seq 1 600); do curl -s localhost:8000/fail > /dev/null; sleep 0.2; done
amtool alert query --alertmanager.url=http://localhost:9093
# Slack #alerts: 🔥 [FIRING:1] HighErrorRate`},
{t:"13. SLO + runbook", d:"99.9% SLO define pannu, burn rate alert test pannu, RUNBOOK.md ezhudhu (enna check pannanum, epdi fix).",
 c:`RUNBOOK.md
## HighErrorRate
Impact: users see 5xx errors
Check: Grafana "App RED" dashboard, Loki {container="app"} |= "error"
Fix: rollback last deploy / restart app / check DB
Escalate: #oncall`},
{t:"14. Kubernetes version (bonus)", d:"Adhe app ah kind cluster la deploy panni kube-prometheus-stack + ServiceMonitor vechu monitor pannu.",
 c:`kind create cluster --name obs
helm install mon prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
kubectl apply -f k8s/app.yaml -f k8s/servicemonitor.yaml   # labels: release: mon`},
{t:"15. README + screenshots", d:"Architecture diagram, dashboard screenshot, Slack alert screenshot, SLO explanation, 'what I learned'. LinkedIn la post podu!",
 c:`README.md
  ## Architecture: app ➜ Prometheus / Alloy ➜ Loki ➜ Grafana, Alertmanager ➜ Slack
  ## Dashboards (RED + USE) screenshots
  ## Alerts + SLO (99.9%, burn rate)
  ## Incident drill: what fired, how I found it, fix
  ## Run it: docker compose up -d`}
]};
