# Quick Start Guide - Distributed Arbitrage Bot

## 🚀 Get Started in 5 Minutes

### Local Development (Docker Compose)

```bash
# 1. Clone and setup
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness

# 2. Configure environment
cp .env.example .env
# Edit .env with your RPC URLs and credentials

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. Access services
# Dashboard: http://localhost:3000
# RabbitMQ: http://localhost:15672 (user: arbitrage, pass: changeme)
# Grafana: http://localhost:3010 (user: admin, pass: admin)
```

### Production Deployment (Kubernetes)

```bash
# 1. Prerequisites
# - Kubernetes cluster running (1.24+)
# - kubectl configured
# - 32GB+ RAM, 8+ CPU cores recommended

# 2. Quick deploy
cd deployment
./deploy.sh production us-east-1

# 3. Monitor
kubectl get pods -n arbitrage-bot -w
kubectl get hpa -n arbitrage-bot

# 4. Access
# Get external IPs
kubectl get svc -n arbitrage-bot
```

## 📊 Architecture Overview

```
Internet → Load Balancer → Services → RabbitMQ → Workers → Redis/TimescaleDB
                ↓
            Dashboard (Real-time UI)
                ↓
            Monitoring (Grafana/Prometheus/Jaeger)
```

## 🎯 Key Components

1. **Scanner** - Monitors DEXs (3-20 replicas)
2. **Pathfinding** - Finds optimal paths (5-30 replicas)
3. **ML Service** - ML predictions (2-10 replicas)
4. **Execution** - Executes trades (3-15 replicas)
5. **Analytics** - Performance tracking (2 replicas)
6. **Bridge** - Cross-chain (2 replicas)
7. **Dashboard** - Web UI (2 replicas)

## 🔧 Common Commands

### Docker Compose

```bash
# View logs
docker-compose logs -f scanner

# Restart service
docker-compose restart pathfinding

# Scale service
docker-compose up -d --scale scanner=5

# Stop all
docker-compose down
```

### Kubernetes

```bash
# View pods
kubectl get pods -n arbitrage-bot

# View logs
kubectl logs -f deployment/scanner-deployment -n arbitrage-bot

# Scale manually
kubectl scale deployment scanner-deployment --replicas=10 -n arbitrage-bot

# Port forward for local access
kubectl port-forward svc/dashboard-service 3000:3000 -n arbitrage-bot
```

## 📈 Performance Metrics

- **Target**: 10,000+ opportunities/second
- **Latency**: <50ms end-to-end
- **Uptime**: 99.9%
- **Auto-scaling**: CPU/Memory + Custom metrics

## 🔍 Monitoring

Access monitoring dashboards:

```bash
# Grafana (metrics visualization)
kubectl port-forward svc/grafana 3000:3000 -n arbitrage-bot

# Prometheus (metrics)
kubectl port-forward svc/prometheus 9090:9090 -n arbitrage-bot

# Jaeger (tracing)
kubectl port-forward svc/jaeger 16686:16686 -n arbitrage-bot
```

## 🛠️ Troubleshooting

**Pods not starting?**
```bash
kubectl describe pod <pod-name> -n arbitrage-bot
kubectl logs <pod-name> -n arbitrage-bot
```

**High queue depth?**
```bash
# Scale up workers
kubectl scale deployment pathfinding-deployment --replicas=30 -n arbitrage-bot
```

**Database issues?**
```bash
# Test connection
kubectl exec -it timescaledb-0 -n arbitrage-bot -- psql -U arbitrage
```

## 📚 Next Steps

1. **Configure**: Edit `k8s/base/configmap.yaml` and `secret.yaml`
2. **Customize**: Adjust replica counts in Helm values
3. **Monitor**: Set up alerts in Grafana
4. **Scale**: Enable auto-scaling with custom metrics
5. **Multi-region**: Deploy to additional regions

## 🔐 Security Checklist

- [ ] Change default passwords in secrets
- [ ] Configure TLS/SSL certificates
- [ ] Set up network policies
- [ ] Enable RBAC
- [ ] Rotate credentials regularly
- [ ] Audit logs regularly

## 📖 Documentation

- Full Architecture: `DISTRIBUTED_ARCHITECTURE.md`
- Deployment Guide: `deployment/README.md`
- API Documentation: `docs/API.md`
- Monitoring Guide: `docs/REALTIME_MONITORING.md`

## 💡 Tips

1. Start small: Begin with minimum replicas and scale up
2. Monitor metrics: Watch CPU/memory/queue depth
3. Use read replicas: For analytics queries
4. Enable caching: Redis TTL tuning
5. Regional deployment: Deploy closer to blockchain nodes

## 📜 Smart Contract Deployment (FlashSwapV2)

### Deploy Flash Loan Arbitrage Contract to Base Network

FlashSwapV2 is an advanced flash loan arbitrage contract supporting Uniswap V3 and Aave V3 on Base network.

```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to Base Sepolia (testnet)
npm run deploy:flashswapv2:testnet

# 3. Deploy to Base Mainnet
npm run deploy:flashswapv2

# 4. Verify on Basescan
npx hardhat verify --network base <CONTRACT_ADDRESS> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

**For detailed documentation, see:**
- [FlashSwapV2 Documentation](docs/FLASHSWAP_V2_DOCUMENTATION.md)
- [Deployment Summary](FLASHSWAP_V2_DEPLOYMENT_SUMMARY.md)

## 🆘 Support

- GitHub Issues: https://github.com/StableExo/Copilot-Consciousness/issues
- Documentation: See `/docs` directory
- Examples: See `/examples` directory

## 📄 License

MIT License - See LICENSE file
