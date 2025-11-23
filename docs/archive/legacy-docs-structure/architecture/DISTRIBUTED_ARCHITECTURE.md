# Distributed Architecture - Arbitrage Bot

## Overview

This document describes the distributed, horizontally scalable architecture for the arbitrage bot system. The architecture is designed to handle 10,000+ opportunities per second with <50ms latency, zero downtime deployments, and automatic failover.

## Architecture Components

### 1. Kubernetes Orchestration

The system runs on Kubernetes for container orchestration, providing:
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) based on CPU, memory, and custom metrics
- **Health Checks**: Liveness and readiness probes for all services
- **Self-healing**: Automatic pod restarts on failures
- **Rolling Updates**: Zero-downtime deployments
- **Resource Management**: CPU and memory limits/requests

### 2. Microservices

The monolithic application is broken into specialized microservices:

#### Scanner Service (Port 3001)
- Monitors DEXs for arbitrage opportunities
- Publishes opportunities to RabbitMQ
- Auto-scales: 3-20 replicas
- Resources: 256Mi-512Mi memory, 250m-500m CPU

#### Pathfinding Service (Port 3002)
- Consumes opportunities from queue
- Finds optimal arbitrage paths
- Uses Redis for path caching
- Auto-scales: 5-30 replicas
- Resources: 512Mi-1Gi memory, 500m-1000m CPU

#### ML Service (Port 3003)
- Provides ML predictions for profitability
- Gas optimization recommendations
- Model caching in Redis
- Auto-scales: 2-10 replicas
- Resources: 1Gi-2Gi memory, 1000m-2000m CPU

#### Execution Service (Port 3004)
- Executes trades on-chain
- Monitors transaction status
- Records execution results
- Auto-scales: 3-15 replicas
- Resources: 512Mi-1Gi memory, 500m-1000m CPU

#### Analytics Service (Port 3005)
- Aggregates performance metrics
- Generates insights and reports
- Reads from TimescaleDB
- 2 replicas (read-heavy)

#### Bridge Service (Port 3006)
- Handles cross-chain communication
- Manages bridge transactions
- 2 replicas

#### Dashboard Service (Port 3000)
- Web UI and API
- Real-time WebSocket updates
- 2 replicas

### 3. Message Queue System - RabbitMQ

**Queues**:
- `opportunities`: Scanner → Pathfinding (max 100k messages)
- `paths`: Pathfinding → Execution (max 50k messages)
- `executions`: Execution results
- `ml_requests`: ML prediction requests
- `ml_responses`: ML prediction results
- `alerts`: System alerts
- Dead-letter queues for failed messages

**Configuration**:
- 3 RabbitMQ nodes for high availability
- Persistent messages
- Message TTL: 5 minutes for opportunities
- Dead-letter exchange for failed processing
- Clustering via Kubernetes service discovery

### 4. Distributed Caching - Redis Cluster

**Use Cases**:
- Price data caching (TTL: 1s)
- Liquidity pool caching
- Gas price caching
- Opportunity deduplication (TTL: 5 minutes)
- Path caching (TTL: 1 minute)
- ML model predictions (TTL: 1 minute)
- Session storage

**Configuration**:
- 1 master + 2 replicas
- Master-slave replication
- AOF persistence
- LRU eviction policy
- Max memory: 2GB per node

### 5. Time-Series Database - TimescaleDB

**Tables**:
- `opportunities`: All detected opportunities (partitioned by time and chain_id)
- `executions`: Trade execution records
- `analytics`: Performance metrics

**Features**:
- Automatic partitioning by time
- Compression for old data
- Continuous aggregates for analytics
- Retention policy: 90 days for opportunities/executions
- Read replicas for analytics queries

**Indexes**:
- Chain ID + timestamp
- Opportunity type + timestamp
- Profit amount (descending)
- Execution status

### 6. Service Discovery - Consul

**Features**:
- Dynamic service registration
- Health checks
- Key-value configuration store
- Service mesh capabilities
- 3-node cluster

### 7. Load Balancer & API Gateway - Nginx

**Features**:
- Rate limiting: 100 req/s per IP
- Circuit breakers
- SSL/TLS termination
- WebSocket support for dashboard
- Request/response buffering
- Connection pooling (keepalive)
- Gzip compression

**Routes**:
- `/api/scanner/*` → Scanner service
- `/api/pathfinding/*` → Pathfinding service
- `/api/ml/*` → ML service
- `/api/execution/*` → Execution service
- `/api/analytics/*` → Analytics service
- `/api/bridge/*` → Bridge service
- `/*` (dashboard.arbitrage.bot) → Dashboard service

### 8. Monitoring & Observability

#### Prometheus
- Metrics collection from all services
- Custom metrics: opportunities/sec, queue depth, latency
- 30-day retention
- Alert rules for anomalies

#### Grafana
- Real-time dashboards
- Performance metrics visualization
- Alert management
- Data sources: Prometheus, TimescaleDB, Jaeger

#### Jaeger
- Distributed tracing
- Request flow visualization
- Performance bottleneck identification
- Trace sampling

#### ELK Stack (Future)
- Centralized logging
- Log aggregation from all pods
- Full-text search
- Log retention: 30 days

### 9. Multi-Region Deployment

**Regions**:
- **US-East**: Primary region (Virginia)
- **EU-West**: European traffic (Ireland)
- **Asia-Pacific**: Asian traffic (Singapore)

**Features**:
- Active-active deployment
- Cross-region data replication for analytics
- Region-specific RPC endpoints
- Geo-based load balancing
- Regional failover

### 10. Auto-scaling Configuration

**Metrics for Scaling**:
- CPU utilization: 70% target
- Memory utilization: 80% target
- Custom metrics:
  - Opportunities per second
  - Queue depth (RabbitMQ)
  - Request latency (p95)
  - Active connections

**Scale-up Behavior**:
- Max 100% increase per minute
- Or +2 pods per minute
- Stabilization window: 60 seconds

**Scale-down Behavior**:
- Max 50% decrease per 2 minutes
- Stabilization window: 5 minutes

## Performance Targets

- **Throughput**: 10,000+ opportunities/second
- **Latency**: <50ms end-to-end (scan to execution decision)
- **Availability**: 99.9% uptime
- **Recovery Time**: <60 seconds for pod failures
- **Deployment**: Zero downtime with rolling updates

## Deployment

### Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.x
- Docker registry access

### Quick Start

```bash
# Deploy using the script
cd deployment
./deploy.sh production us-east-1

# Or using Helm
helm install arbitrage-bot ./helm/arbitrage-bot -n arbitrage-bot --create-namespace

# Or using Kustomize
kubectl apply -k k8s/overlays/production
```

### Local Development

```bash
# Using docker-compose for local testing
docker-compose up -d

# Access services
# Dashboard: http://localhost:3000
# RabbitMQ Management: http://localhost:15672
# Grafana: http://localhost:3010
```

## Monitoring

### Health Checks

```bash
# Check all pods
kubectl get pods -n arbitrage-bot

# Check HPA status
kubectl get hpa -n arbitrage-bot

# Check specific service
kubectl logs -f -n arbitrage-bot -l app=scanner
```

### Metrics

Access Grafana at configured endpoint to view:
- Opportunities detected per second
- Execution success rate
- P50, P95, P99 latencies
- Queue depths
- Resource utilization
- Error rates

### Alerts

Configured alerts for:
- High error rates (>5%)
- High latency (>100ms)
- Queue buildup (>10k messages)
- Pod failures
- Resource exhaustion
- Database connectivity issues

## Scaling

### Manual Scaling

```bash
# Scale scanner service
kubectl scale deployment scanner-deployment -n arbitrage-bot --replicas=10

# Scale pathfinding service
kubectl scale deployment pathfinding-deployment -n arbitrage-bot --replicas=20
```

### Automatic Scaling

HPA automatically scales based on:
- Resource metrics (CPU, memory)
- Custom metrics (opportunities/sec, queue depth)

## Disaster Recovery

### Backup Strategy
- TimescaleDB: Daily backups to S3
- Redis: AOF persistence + snapshots
- RabbitMQ: Message persistence enabled
- Config: GitOps approach with version control

### Failover Procedures
1. Regional failover: DNS-based routing to healthy region
2. Pod failover: Kubernetes auto-restart
3. Database failover: Read replica promotion
4. Queue failover: RabbitMQ cluster handles node failures

## Security

- **Secrets Management**: Kubernetes secrets for credentials
- **Network Policies**: Restrict pod-to-pod communication
- **RBAC**: Role-based access control
- **TLS**: Encrypted communication (future)
- **Pod Security**: Non-root containers, read-only filesystems

## Cost Optimization

- Spot instances for non-critical workloads
- Auto-scaling to match load
- Data retention policies
- Regional data transfer optimization
- Reserved instances for baseline capacity

## Future Enhancements

1. **Service Mesh**: Istio for advanced traffic management
2. **GitOps**: ArgoCD for declarative deployments
3. **Chaos Engineering**: Automated failure testing
4. **Advanced ML**: Real-time model training and deployment
5. **Multi-cloud**: AWS, GCP, Azure support
6. **Edge Computing**: Deploy closer to blockchain nodes

## Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl describe pod <pod-name> -n arbitrage-bot
kubectl logs <pod-name> -n arbitrage-bot
```

**High queue depth**
```bash
# Check RabbitMQ management UI
# Scale up pathfinding workers
kubectl scale deployment pathfinding-deployment -n arbitrage-bot --replicas=30
```

**Database connectivity**
```bash
kubectl exec -it <pod-name> -n arbitrage-bot -- psql -h timescaledb-service -U arbitrage
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/StableExo/Copilot-Consciousness/issues
- Documentation: See docs/ directory
- Monitoring: Check Grafana dashboards

## Architecture Diagram

```
                        ┌─────────────────┐
                        │  Load Balancer  │
                        │     (Nginx)     │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐       ┌───────▼────────┐
            │   Dashboard    │       │   API Gateway  │
            │    Service     │       │   (Services)   │
            └───────┬────────┘       └───────┬────────┘
                    │                        │
                    │         ┌──────────────┴──────────────┐
                    │         │                             │
         ┌──────────▼─────────▼────────┐         ┌─────────▼─────────┐
         │      RabbitMQ Cluster       │         │   Redis Cluster   │
         │  (Message Queues)           │         │   (Cache)         │
         └──────────┬──────────────────┘         └─────────┬─────────┘
                    │                                      │
    ┌───────────────┼───────────────┬─────────────────────┤
    │               │               │                     │
┌───▼────┐    ┌────▼─────┐   ┌────▼──────┐      ┌──────▼──────┐
│Scanner │    │Pathfinding│   │    ML     │      │  Execution  │
│Service │    │  Service  │   │  Service  │      │   Service   │
└───┬────┘    └────┬──────┘   └────┬──────┘      └──────┬──────┘
    │              │               │                     │
    └──────────────┴───────────────┴─────────────────────┘
                            │
                   ┌────────▼─────────┐
                   │   TimescaleDB    │
                   │  (Time-Series)   │
                   └──────────────────┘
```

## License

MIT License - See LICENSE file for details
