# Prometheus / Alertmanager Import

1) Copy rules into your stack  
```bash
cp ops/alerts/prometheus-rules.yml /etc/prometheus/rules/zeni-rules.yml
systemctl reload prometheus   # or docker-compose restart prometheus
```

2) Verify load  
```bash
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="zeni-risk-alerts") | .rules[].name'
```

3) Grafana dashboards  
- Import Prometheus as a data source.  
- Add panels for:
  - `rate(pay_risk_flags_total{level="high"}[5m])`
  - `rate(pay_anomaly_flagged_total[5m])`
  - `increase(audit_forward_failures_total[5m])`

4) Alert destinations  
Configure Alertmanager routes to your preferred sinks (Slack/webhook/PagerDuty).
