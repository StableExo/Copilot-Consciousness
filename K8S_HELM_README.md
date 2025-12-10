# Kubernetes & Helm Deployment

Infrastructure-as-code for deploying TheWarden on Kubernetes clusters.

## Status

⚠️ **Deployment Status**: These configurations are prepared for future Kubernetes deployment. Currently not actively deployed but maintained for production scaling readiness.

## Contents

### helm/
Helm charts for Kubernetes package management:
- `helm/arbitrage-bot/` - Helm chart for TheWarden deployment
  - Values for different environments
  - Service definitions
  - Resource limits
  - Monitoring configuration

### k8s/
Kubernetes manifests and Kustomize overlays:
- `k8s/base/` - Base Kubernetes configurations
- `k8s/ingress/` - Ingress rules and TLS
- `k8s/monitoring/` - Prometheus, Grafana setup
- `k8s/overlays/` - Environment-specific overlays (dev, staging, production)
- `k8s/security/` - NetworkPolicies, PodSecurityPolicies
- `k8s/services/` - Service definitions
- `k8s/workers/` - Worker node configurations

## Quick Start (When Ready for K8s Deployment)

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3.x installed

### Deploy with Helm
```bash
# Add namespace
kubectl create namespace arbitrage-bot

# Install chart
helm install arbitrage-bot ./helm/arbitrage-bot \
  -n arbitrage-bot \
  --create-namespace \
  --values helm/arbitrage-bot/values.yaml
```

### Deploy with Kustomize
```bash
# Development
kubectl apply -k k8s/overlays/development

# Production
kubectl apply -k k8s/overlays/production
```

## Configuration

### Environment Variables
Configure via ConfigMap (`k8s/base/configmap.yaml`):
- RPC URLs
- API keys (use Secrets for sensitive data)
- Chain IDs
- Feature flags

### Secrets
Store sensitive data in Kubernetes Secrets:
```bash
kubectl create secret generic arbitrage-bot-secrets \
  --from-literal=WALLET_PRIVATE_KEY=0x... \
  --from-literal=RPC_API_KEY=... \
  -n arbitrage-bot
```

### Resource Limits
Configured in Helm values:
- CPU: 1-2 cores
- Memory: 2-4GB
- Storage: 10GB for logs

## Monitoring

### Prometheus
Metrics exposed on `:3000/metrics`:
- Arbitrage opportunities detected
- Trade success rate
- Gas costs
- Latency
- Error rates

### Grafana Dashboards
Pre-configured dashboards in `k8s/monitoring/`:
- Arbitrage performance
- System health
- Gas usage
- Profit tracking

## Scaling

### Horizontal Pod Autoscaler
```bash
kubectl autoscale deployment arbitrage-bot \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n arbitrage-bot
```

### Manual Scaling
```bash
kubectl scale deployment arbitrage-bot --replicas=5 -n arbitrage-bot
```

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Build Container**
   ```bash
   docker build -t arbitrage-bot:latest .
   ```

3. **Test in Minikube**
   ```bash
   minikube start
   kubectl apply -k k8s/overlays/development
   ```

4. **Deploy to Staging**
   ```bash
   kubectl apply -k k8s/overlays/staging
   ```

5. **Production Deployment**
   ```bash
   helm upgrade arbitrage-bot ./helm/arbitrage-bot \
     -n arbitrage-bot \
     --values helm/arbitrage-bot/values-production.yaml
   ```

## Related Documentation

- [Docker Configuration](../docker/README.md) - Container setup
- [Deployment Guide](../docs/deployment/) - Deployment procedures
- [Distributed Architecture](../docs/archive/legacy-docs-structure/architecture/DISTRIBUTED_ARCHITECTURE.md) - K8s architecture details
- [Official Kubernetes Docs](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## When to Use K8s Deployment

Consider Kubernetes deployment when:
- [ ] Scaling beyond single instance
- [ ] Multiple environment management (dev, staging, prod)
- [ ] High availability requirements (99.9%+ uptime)
- [ ] Complex monitoring and alerting needs
- [ ] Team collaboration on infrastructure

Currently, TheWarden runs effectively as:
- Single Docker container (see `docker/` directory)
- Standalone Node.js process (see `./TheWarden` script)
- PM2 managed process (see `ecosystem.config.json`)

---

**Note**: These K8s configurations are maintained and ready for when scaling requirements necessitate orchestration. Until then, simpler deployment methods are recommended.
