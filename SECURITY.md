# Security Guide - Distributed Arbitrage Bot

## ⚠️ CRITICAL: Pre-Production Security Checklist

Before deploying to production, you **MUST** complete these security steps:

### 1. Replace All Default Passwords

**Generate strong passwords:**
```bash
# Generate a secure password
openssl rand -base64 32

# Or use this for multiple passwords
for i in {1..5}; do openssl rand -base64 32; done
```

**Files to update:**
- `k8s/base/secret.yaml` - Replace ALL "REPLACE-WITH-*" placeholders
- `.env` - Update all passwords
- `docker-compose.yml` - Update environment variables

### 2. Secure Private Keys (CRITICAL)

**NEVER commit private keys to version control!**

**Recommended approaches:**

#### Option A: External Secret Management (Recommended)
```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name arbitrage-wallet-key \
  --secret-string "0xYOUR_ACTUAL_PRIVATE_KEY"

# Or HashiCorp Vault
vault kv put secret/arbitrage/wallet private_key="0xYOUR_KEY"

# Or Azure Key Vault
az keyvault secret set \
  --vault-name ArbitrageVault \
  --name wallet-private-key \
  --value "0xYOUR_KEY"
```

#### Option B: Kubernetes Secrets (Better than ConfigMaps)
```bash
# Create secret directly (not from YAML file)
kubectl create secret generic wallet-secret \
  --from-literal=WALLET_PRIVATE_KEY="0xYOUR_ACTUAL_PRIVATE_KEY" \
  -n arbitrage-bot

# Then DELETE k8s/base/secret.yaml or remove the private key field
```

#### Option C: Sealed Secrets (GitOps-friendly)
```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Seal your secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Commit sealed-secret.yaml (encrypted), delete secret.yaml
```

### 3. API Keys and RPC URLs

**Obtain API keys from:**
- Alchemy: https://www.alchemy.com/
- Infura: https://infura.io/
- QuickNode: https://www.quicknode.com/

**Update in secrets:**
```bash
kubectl create secret generic rpc-secrets \
  --from-literal=ETHEREUM_RPC_URL="https://eth-mainnet.alchemyapi.io/v2/YOUR-REAL-API-KEY" \
  --from-literal=POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR-REAL-API-KEY" \
  -n arbitrage-bot
```

## 🔒 Security Best Practices

### Network Security

#### Enable Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-scanner
  namespace: arbitrage-bot
spec:
  podSelector:
    matchLabels:
      app: scanner
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: rabbitmq
  - to:
    - podSelector:
        matchLabels:
          app: redis
```

#### Enable TLS/SSL

**For Ingress:**
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

**For RabbitMQ (TLS):**
```bash
# Generate certificates
openssl req -newkey rsa:4096 -x509 -sha256 -days 365 -nodes \
  -out rabbitmq-cert.pem -keyout rabbitmq-key.pem

# Create secret
kubectl create secret tls rabbitmq-tls \
  --cert=rabbitmq-cert.pem \
  --key=rabbitmq-key.pem \
  -n arbitrage-bot
```

### Access Control

#### RBAC for Kubernetes
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: arbitrage-app-role
  namespace: arbitrage-bot
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: arbitrage-app-binding
  namespace: arbitrage-bot
subjects:
- kind: ServiceAccount
  name: default
  namespace: arbitrage-bot
roleRef:
  kind: Role
  name: arbitrage-app-role
  apiGroup: rbac.authorization.k8s.io
```

#### Pod Security Standards
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: arbitrage-bot
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Container Security

#### Security Context (Already implemented)
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

#### Image Scanning
```bash
# Scan images with Trivy
trivy image arbitrage-bot/scanner:latest

# Scan images with Grype
grype arbitrage-bot/scanner:latest
```

### Data Security

#### Encrypt Secrets at Rest
```bash
# Enable encryption in Kubernetes
# Add to kube-apiserver flags:
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

**encryption-config.yaml:**
```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

#### Database Encryption
```sql
-- Enable encryption for sensitive columns in TimescaleDB
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt wallet addresses
UPDATE executions 
SET wallet_address = pgp_sym_encrypt(wallet_address, 'encryption-key');
```

## 🔐 Runtime Security

### Audit Logging
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  namespaces: ["arbitrage-bot"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### Secrets Rotation
```bash
# Rotate RabbitMQ password
kubectl create secret generic arbitrage-secrets-new \
  --from-literal=RABBITMQ_PASSWORD="$(openssl rand -base64 32)" \
  -n arbitrage-bot

# Update deployments to use new secret
kubectl set env deployment/scanner-deployment \
  --from=secret/arbitrage-secrets-new \
  -n arbitrage-bot

# Delete old secret after verification
kubectl delete secret arbitrage-secrets -n arbitrage-bot
```

### Monitoring and Alerts

**Security Alerts in Prometheus:**
```yaml
groups:
- name: security
  rules:
  - alert: HighFailedAuthAttempts
    expr: rate(auth_failures[5m]) > 10
    for: 5m
    annotations:
      summary: "High failed authentication attempts detected"
  
  - alert: UnauthorizedAccess
    expr: rate(http_requests{status="401"}[5m]) > 5
    for: 2m
    annotations:
      summary: "Multiple unauthorized access attempts"
```

## 🛡️ Defense in Depth

### Rate Limiting (Already configured)
- API Gateway: 100 req/s per IP
- Service level: Configurable in code

### Input Validation
```typescript
// Example: Validate RPC responses
function validateRPCResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;
  if (!response.result) return false;
  // Add more validation...
  return true;
}
```

### Error Handling
```typescript
// Don't expose internal details in errors
try {
  // Operation
} catch (error) {
  console.error('[Internal] Error:', error); // Logs
  res.status(500).json({ error: 'Internal server error' }); // Response
}
```

## 🔍 Security Monitoring

### Regular Security Scans
```bash
# Weekly security scan schedule
0 2 * * 0 /path/to/security-scan.sh

# security-scan.sh
#!/bin/bash
trivy image --severity HIGH,CRITICAL arbitrage-bot/scanner:latest
kubectl get pods -n arbitrage-bot -o json | jq '.items[].spec.containers[].image' | xargs trivy image
```

### Audit Checklist (Monthly)

- [ ] Review and rotate all credentials
- [ ] Scan all images for vulnerabilities
- [ ] Review access logs for anomalies
- [ ] Update all dependencies
- [ ] Review RBAC permissions
- [ ] Test backup and recovery
- [ ] Review network policies
- [ ] Audit secret access logs

## 📋 Compliance

### PCI-DSS Considerations
- Encrypt data in transit (TLS)
- Encrypt data at rest
- Implement access controls
- Log all access
- Regular security audits

### GDPR Considerations
- Data minimization
- User consent for data collection
- Right to deletion
- Data breach notification

## 🚨 Incident Response

### In Case of Breach

1. **Immediate Actions:**
   ```bash
   # Isolate affected pods
   kubectl scale deployment/scanner-deployment --replicas=0 -n arbitrage-bot
   
   # Block suspicious IPs at ingress
   kubectl annotate ingress arbitrage-ingress \
     nginx.ingress.kubernetes.io/whitelist-source-range="trusted-ip-range" \
     -n arbitrage-bot
   ```

2. **Investigation:**
   - Review logs: `kubectl logs -n arbitrage-bot --all-containers=true --since=1h`
   - Check audit logs
   - Review Prometheus alerts

3. **Recovery:**
   - Rotate all credentials
   - Update images if compromised
   - Restore from backup if needed

## 📞 Security Contacts

- **Report Security Issues**: security@example.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Security Team**: Slack #security-alerts

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)

---

**Remember**: Security is not a one-time task. Regular audits, updates, and monitoring are essential for maintaining a secure system.
