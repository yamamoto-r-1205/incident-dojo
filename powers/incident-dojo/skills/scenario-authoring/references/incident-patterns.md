# Incident patterns

Generic Linux / AWS failure modes suitable for dojo scenarios. Each entry: symptom →
evidence → trap → fix → prevention. All examples are fictional.

## Severity guide

| Level | Meaning | Response target |
|---|---|---|
| P1 | Full outage, all users affected | Immediate |
| P2 | Major feature broken, some users affected | Start within 15 min |
| P3 | Degraded, workaround exists | Start within 1 h |
| P4 | Minor, no user impact | Normal work |

## First 5 minutes (what good players do)

1. Reproduce the symptom (`curl -I`, health endpoint, ALB target health).
2. Separate layers: AWS infrastructure vs. host vs. application.
3. Ask "what changed?": deploys, config, patches, security groups.
4. Look before you touch: status, logs, metrics. Never delete evidence.

---

## Linux

### Service not running after deploy
- **Symptom:** 502 from the reverse proxy.
- **Evidence:** `systemctl status <svc>`, `journalctl -u <svc>`, `ss -tlnp`.
- **Trap:** restarting without fixing the config fails again.
- **Fix:** restore the config (diff against backup), then restart.
- **Prevention:** keep environment config out of artifacts, smoke test after deploy.

### Disk full
- **Symptom:** writes fail (`No space left on device`), app returns 500.
- **Evidence:** `df -h`, `du -sh /var/log/* | sort -h`, `df -i` for inodes.
- **Trap:** `rm` of a log file still held open does not free space. Check with
  `lsof +L1`; the process must be restarted, or the file truncated with `: > file` /
  `truncate -s 0`.
- **Fix:** truncate or restart the writer, then fix log level / logrotate.
- **Prevention:** logrotate with `copytruncate` or a reopen signal, disk usage alarms.

### Inode exhaustion
- **Symptom:** `No space left on device` while `df -h` shows free space.
- **Evidence:** `df -i`, `find <dir> -xdev -type f | wc -l` on session/cache dirs.
- **Trap:** looking only at `df -h`.
- **Fix:** remove the millions of small files (scoped path), fix the cleanup job.

### OOM killer
- **Symptom:** process disappears, restarts in a loop, latency spikes.
- **Evidence:** `dmesg | grep -i oom`, `journalctl -k`, `free -h`, `ps aux --sort=-%mem`.
- **Trap:** adding swap or rebooting hides a leak introduced by a recent change.
- **Fix:** roll back the change (e.g. cache size), restart, set `MemoryMax`.
- **Prevention:** memory limits, memory alarms, load test config changes.

### High CPU
- **Evidence:** `top -b -n 1`, `ps aux --sort=-%cpu`, `cat /proc/loadavg`.
- **Note:** an unknown process can mean compromise. Investigate before killing.

### Connection / fd exhaustion
- **Symptom:** `Too many open files`, many `CLOSE_WAIT`.
- **Evidence:** `ss -s`, `ss -tanp state close-wait`, `cat /proc/<pid>/limits`.
- **Trap:** raising `ulimit` only delays the leak.

### Certificate expiry
- **Evidence:** `openssl s_client -connect host:443`, `openssl x509 -enddate -noout -in cert.pem`.
- **Fix:** renew / deploy the new certificate and reload the web server.

---

## AWS

### ALB targets unhealthy
- **Symptom:** 503 from the ALB.
- **Evidence:** `aws elbv2 describe-target-health --target-group-arn <arn>`,
  `aws ec2 describe-security-groups --group-ids <sg>`.
- **Trap:** the app is healthy on the host (`curl localhost` works) because the
  problem is a security group change, not the app.
- **Fix:** restore the ingress rule from the ALB security group to the target port.
- **Prevention:** manage SGs as code, alarm on `UnHealthyHostCount`.

### RDS too many connections
- **Symptom:** `FATAL: too many connections` / `Too many connections` in app logs.
- **Evidence:** CloudWatch `DatabaseConnections`, `aws rds describe-events`, app pool settings.
- **Trap:** rebooting the DB drops every client and the leak comes back.
- **Fix:** roll back the leaking release / restart the app to release connections.
- **Prevention:** pool limits, RDS Proxy, alarms on connection count.

### ECS tasks keep stopping
- **Evidence:** `aws ecs describe-services`, `aws ecs list-tasks --desired-status STOPPED`, stopped reason, CloudWatch Logs.

### Instance unreachable
- **Evidence:** system log, status checks, SG port 22 / SSM Session Manager.
- **Note:** stop/start (not reboot) moves the instance to new hardware.

---

## Universal danger list

Model these as `danger` rules when they are tempting in the scenario:
deleting logs during an incident, `reboot` without diagnosis, `rm -rf` on data dirs,
dropping databases, terminating instances, `iptables -F`, rebooting a production DB.
