# Malli Akka Monitoring + Observability Class 📈

A monitoring and observability course for DevOps beginners. Malli Akka, an animated teacher avatar, explains Prometheus, Grafana, Alertmanager, Loki and OpenTelemetry in Tanglish with kid-style analogies and Tamil voice narration, in the same format as the [Kubernetes](https://kubernets.vercel.app), [Terraform + Ansible](https://terraform-ansible-course.vercel.app) and [CI/CD + Jenkins](https://cicd-jenkins-course.vercel.app) courses.

- **Basics (3):** monitoring vs observability, golden signals / RED / USE, SLI / SLO / SLA and error budgets
- **Prometheus (7):** architecture, `prometheus.yml` and service discovery, exporters (node, cAdvisor, blackbox), metric types and app instrumentation, PromQL basics, advanced PromQL and recording rules, alerting rules and Alertmanager
- **Grafana (2):** dashboards; variables, alerting and provisioning as code
- **Kubernetes (1):** kube-prometheus-stack, ServiceMonitor, PrometheusRule
- **Logs & traces (3):** Loki + LogQL vs ELK, OpenTelemetry tracing with Jaeger/Tempo, scaling Prometheus (remote_write, Thanos/Mimir, cardinality)
- **SLO alerting (1):** burn rate, alert fatigue, runbooks, on-call
- **Project (1):** full Docker Compose stack: app + Prometheus + node_exporter + Alertmanager ➜ Slack + Loki + Alloy + Grafana
- **6 interview lessons:** Prometheus fundamentals, alert fatigue, investigating a slow app, Prometheus problems, tool comparisons, common questions
- Practice terminal with commands **and PromQL / LogQL queries** (4 per lesson), 5-question quizzes, PromQL cheat sheet, 15-step project guide, 24-question mock interview
- Progress is saved in localStorage; the layout works on mobile

## Layout

```
public/            ← the only folder Vercel serves (vercel.json → outputDirectory)
  index.html       player, practice, quiz, cheat sheet, project guide, mock interview
  lessons.js       18 core lessons  [subtitle, board]
  extras.js        interview lessons, practice tasks, quizzes
  project.js       project guide steps
  mock.js          mock interview questions
  durations.js     lesson lengths (generated)
  audio/           {lesson}-{scene}.mp3, mq-N.mp3, fx-*.mp3 (generated)
tools/             NOT deployed
  ta.mjs           Tanglish subtitle ➜ Tamil-script narration
  gen-audio.mjs    TTS: Sarvam (bulbul:v3, kavitha) or TTS=fish (Fish Audio free model)
  durations.mjs    measures audio ➜ public/durations.js
  check.mjs        validates lessons / practice regexes / quizzes
.env               SARVAM_API_KEY / FISH_API_KEY  (git-ignored, never deployed)
```

## Regenerating audio

```bash
cp .env.example .env    # add your key
node tools/gen-audio.mjs --print 9                 # preview the Tamil narration of lesson 9
TTS=fish node tools/gen-audio.mjs --only 9-3 --force
TTS=fish node tools/gen-audio.mjs --all
node tools/durations.mjs
node tools/check.mjs
```

## Deploy

Import this repo in Vercel (no build step; `vercel.json` serves `public/`).
