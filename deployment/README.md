# Deployment Guide - Distributed Arbitrage Bot

## Quick Start

### Prerequisites

- Docker and Docker Compose (for local development)
- Kubernetes cluster (1.24+) (for production)
- kubectl configured to access your cluster
- Helm 3.x (optional)
- At least 32GB RAM and 8 CPU cores for full stack

### Local Development with Docker Compose

```bash
# Clone the repository
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f scanner
docker-compose logs -f pathfinding

# Stop all services
docker-compose down
```

**Access local services:**
- Dashboard: http://localhost:3000
- RabbitMQ Management: http://localhost:15672 (user: arbitrage, pass: changeme)
- Grafana: http://localhost:3010 (user: admin, pass: admin)
- Prometheus: http://localhost:9090
- Jaeger UI: http://localhost:16686

### Production Deployment to Kubernetes

#### Option 1: Using deployment script (Recommended)

```bash
cd deployment
./deploy.sh production us-east-1
```

#### Option 2: Using Helm

```bash
# Add custom values (optional)
cat > custom-values.yaml <<EOF
services:
  scanner:
    replicas: 10
  pathfinding:
    replicas: 15
EOF

# Install with Helm
helm install arbitrage-bot ./helm/arbitrage-bot \
  -n arbitrage-bot \
  --create-namespace \
  -f custom-values.yaml

# Upgrade
helm upgrade arbitrage-bot ./helm/arbitrage-bot -n arbitrage-bot

# Uninstall
helm uninstall arbitrage-bot -n arbitrage-bot
```

#### Option 3: Using Kustomize

```bash
# Deploy to production
kubectl apply -k k8s/overlays/production

# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to development
kubectl apply -k k8s/overlays/dev
```

#### Option 4: Manual deployment

```bash
# Create namespace and base resources
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml

# Deploy infrastructure
kubectl apply -f infrastructure/rabbitmq/deployment.yaml
kubectl apply -f infrastructure/redis/deployment.yaml
kubectl apply -f infrastructure/timescaledb/deployment.yaml
kubectl apply -f infrastructure/consul/deployment.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=rabbitmq -n arbitrage-bot --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n arbitrage-bot --timeout=300s

# Deploy services
kubectl apply -f k8s/services/scanner/deployment.yaml
kubectl apply -f k8s/services/pathfinding/deployment.yaml
kubectl apply -f k8s/services/ml/deployment.yaml
kubectl apply -f k8s/services/execution/deployment.yaml
kubectl apply -f k8s/services/analytics/deployment.yaml
kubectl apply -f k8s/services/bridge/deployment.yaml
kubectl apply -f k8s/services/dashboard/deployment.yaml

# Deploy monitoring
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
kubectl apply -f k8s/monitoring/grafana-deployment.yaml
kubectl apply -f k8s/monitoring/jaeger-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/ingress/ingress.yaml
```

## Building Docker Images

### Build all services

```bash
# Build all service images
docker build -f docker/Dockerfile.scanner -t arbitrage-bot/scanner:latest .
docker build -f docker/Dockerfile.pathfinding -t arbitrage-bot/pathfinding:latest .
docker build -f docker/Dockerfile.ml -t arbitrage-bot/ml:latest .
docker build -f docker/Dockerfile.execution -t arbitrage-bot/execution:latest .
docker build -f docker/Dockerfile.analytics -t arbitrage-bot/analytics:latest .
docker build -f docker/Dockerfile.bridge -t arbitrage-bot/bridge:latest .
docker build -f docker/Dockerfile.dashboard -t arbitrage-bot/dashboard:latest .
```

### Push to registry

```bash
# Tag for your registry
docker tag arbitrage-bot/scanner:latest your-registry.com/arbitrage-bot/scanner:v1.0.0
docker tag arbitrage-bot/pathfinding:latest your-registry.com/arbitrage-bot/pathfinding:v1.0.0
# ... repeat for all services

# Push to registry
docker push your-registry.com/arbitrage-bot/scanner:v1.0.0
docker push your-registry.com/arbitrage-bot/pathfinding:v1.0.0
# ... repeat for all services
```

## Configuration

### Environment Variables

Create a `.env` file or Kubernetes secret with:

```bash
# RabbitMQ
RABBITMQ_USERNAME=arbitrage
RABBITMQ_PASSWORD=your-secure-password

# Redis
REDIS_PASSWORD=your-redis-password

# PostgreSQL/TimescaleDB
POSTGRES_USER=arbitrage
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=arbitrage

# Blockchain RPC URLs
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Wallet (use secure key management in production)
WALLET_PRIVATE_KEY=0x...

# Performance
SCAN_INTERVAL=1000
CONCURRENCY=10
TARGET_THROUGHPUT=10000
```

### Kubernetes Secrets

For production, use Kubernetes secrets:

```bash
kubectl create secret generic arbitrage-secrets \
  --from-literal=RABBITMQ_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --from-literal=ETHEREUM_RPC_URL=https://... \
  -n arbitrage-bot
```

## Monitoring and Observability

### Access Monitoring Tools

```bash
# Get Grafana URL
kubectl get svc grafana -n arbitrage-bot

# Get Prometheus URL
kubectl get svc prometheus -n arbitrage-bot

# Get Jaeger URL
kubectl get svc jaeger -n arbitrage-bot

# Port forward for local access
kubectl port-forward svc/grafana 3000:3000 -n arbitrage-bot
kubectl port-forward svc/prometheus 9090:9090 -n arbitrage-bot
kubectl port-forward svc/jaeger 16686:16686 -n arbitrage-bot
```

### View Logs

```bash
# View all pods
kubectl get pods -n arbitrage-bot

# View logs for specific service
kubectl logs -f deployment/scanner-deployment -n arbitrage-bot
kubectl logs -f deployment/pathfinding-deployment -n arbitrage-bot

# View logs from all scanner pods
kubectl logs -f -l app=scanner -n arbitrage-bot

# View last 100 lines
kubectl logs --tail=100 deployment/scanner-deployment -n arbitrage-bot
```

### Check Metrics

```bash
# Check HPA status
kubectl get hpa -n arbitrage-bot

# Check pod resource usage
kubectl top pods -n arbitrage-bot
kubectl top nodes

# Check service endpoints
kubectl get endpoints -n arbitrage-bot
```

## Scaling

### Manual Scaling

```bash
# Scale up scanner service
kubectl scale deployment scanner-deployment --replicas=10 -n arbitrage-bot

# Scale up pathfinding service
kubectl scale deployment pathfinding-deployment --replicas=20 -n arbitrage-bot
```

### Automatic Scaling

HPA is already configured. View current status:

```bash
kubectl get hpa -n arbitrage-bot

NAME                  REFERENCE                        TARGETS         MINPODS   MAXPODS   REPLICAS
scanner-hpa          Deployment/scanner-deployment    45%/70%         3         20        5
pathfinding-hpa      Deployment/pathfinding-deployment 60%/70%        5         30        8
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n arbitrage-bot

# Check pod logs
kubectl logs <pod-name> -n arbitrage-bot

# Check previous container logs (if restarted)
kubectl logs <pod-name> -n arbitrage-bot --previous
```

### Database connection issues

```bash
# Test TimescaleDB connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n arbitrage-bot -- \
  psql -h timescaledb-service -U arbitrage -d arbitrage

# Test Redis connectivity
kubectl run -it --rm debug --image=redis:7-alpine --restart=Never -n arbitrage-bot -- \
  redis-cli -h redis-master-service -a your-password ping
```

### RabbitMQ queue issues

```bash
# Access RabbitMQ management UI
kubectl port-forward svc/rabbitmq-management 15672:15672 -n arbitrage-bot
# Open http://localhost:15672

# Or use CLI
kubectl exec -it rabbitmq-0 -n arbitrage-bot -- rabbitmqctl list_queues
```

### High memory/CPU usage

```bash
# Check resource usage
kubectl top pods -n arbitrage-bot

# Check if HPA is scaling
kubectl get hpa -n arbitrage-bot

# Manually scale if needed
kubectl scale deployment <deployment-name> --replicas=<count> -n arbitrage-bot
```

## Maintenance

### Updates and Rollouts

```bash
# Update image version
kubectl set image deployment/scanner-deployment scanner=arbitrage-bot/scanner:v1.1.0 -n arbitrage-bot

# Check rollout status
kubectl rollout status deployment/scanner-deployment -n arbitrage-bot

# Rollback if needed
kubectl rollout undo deployment/scanner-deployment -n arbitrage-bot

# View rollout history
kubectl rollout history deployment/scanner-deployment -n arbitrage-bot
```

### Backup

```bash
# Backup TimescaleDB
kubectl exec -it timescaledb-0 -n arbitrage-bot -- \
  pg_dump -U arbitrage arbitrage | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup Redis
kubectl exec -it redis-master-0 -n arbitrage-bot -- redis-cli SAVE
kubectl cp arbitrage-bot/redis-master-0:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Clean Up

```bash
# Delete specific deployment
kubectl delete deployment scanner-deployment -n arbitrage-bot

# Delete namespace (removes everything)
kubectl delete namespace arbitrage-bot

# Using Helm
helm uninstall arbitrage-bot -n arbitrage-bot

# Using docker-compose
docker-compose down -v  # -v removes volumes
```

## Multi-Region Deployment

### Deploy to multiple regions

```bash
# US-East region
kubectl config use-context us-east-1
./deploy.sh production us-east-1

# EU-West region
kubectl config use-context eu-west-1
./deploy.sh production eu-west-1

# Asia-Pacific region
kubectl config use-context ap-southeast-1
./deploy.sh production ap-southeast-1
```

### Cross-region replication

Configure TimescaleDB replication:

```sql
-- On primary region
SELECT * FROM create_subscription('subscription_eu', 'host=eu-primary-host');

-- Monitor replication lag
SELECT * FROM timescaledb_information.replication_status;
```

## Security Best Practices

1. **Secrets Management**
   - Use external secret managers (AWS Secrets Manager, HashiCorp Vault)
   - Rotate credentials regularly
   - Never commit secrets to git

2. **Network Security**
   - Enable network policies
   - Use private subnets for databases
   - Enable TLS for all external traffic

3. **Access Control**
   - Use RBAC for Kubernetes access
   - Implement pod security policies
   - Audit logs regularly

4. **Image Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Run containers as non-root

## Performance Tuning

### Kubernetes Resources

Adjust based on your workload:

```yaml
resources:
  requests:
    memory: "512Mi"  # Guaranteed
    cpu: "500m"      # 0.5 cores
  limits:
    memory: "1Gi"    # Maximum
    cpu: "1000m"     # 1 core
```

### Database Tuning

TimescaleDB configuration:

```sql
-- Increase work memory for complex queries
ALTER SYSTEM SET work_mem = '256MB';

-- Adjust shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '8GB';

-- Increase max connections
ALTER SYSTEM SET max_connections = 500;

-- Reload configuration
SELECT pg_reload_conf();
```

### Redis Tuning

```bash
# In Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-backlog 511
timeout 0
```

## Support

- **Documentation**: See `DISTRIBUTED_ARCHITECTURE.md`
- **Issues**: GitHub Issues
- **Community**: Discord/Slack (if available)

## License

MIT License - See LICENSE file
