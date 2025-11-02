#!/bin/bash
# Deployment script for arbitrage bot distributed system

set -e

ENVIRONMENT=${1:-production}
REGION=${2:-us-east-1}

echo "🚀 Deploying Arbitrage Bot to $ENVIRONMENT in $REGION"

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl not found. Please install kubectl first."
        exit 1
    fi
    echo "✅ kubectl is available"
}

# Function to check if helm is available
check_helm() {
    if ! command -v helm &> /dev/null; then
        echo "❌ helm not found. Please install helm first."
        exit 1
    fi
    echo "✅ helm is available"
}

# Function to create namespace
create_namespace() {
    echo "📦 Creating namespace..."
    kubectl apply -f ../k8s/base/namespace.yaml
    echo "✅ Namespace created"
}

# Function to apply secrets
apply_secrets() {
    echo "🔐 Applying secrets..."
    kubectl apply -f ../k8s/base/secret.yaml
    echo "✅ Secrets applied"
}

# Function to apply configmaps
apply_configmaps() {
    echo "⚙️  Applying configmaps..."
    kubectl apply -f ../k8s/base/configmap.yaml
    echo "✅ ConfigMaps applied"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    echo "🏗️  Deploying infrastructure components..."
    
    # Deploy RabbitMQ
    echo "  📨 Deploying RabbitMQ..."
    kubectl apply -f ../infrastructure/rabbitmq/deployment.yaml
    
    # Deploy Redis
    echo "  💾 Deploying Redis..."
    kubectl apply -f ../infrastructure/redis/deployment.yaml
    
    # Deploy TimescaleDB
    echo "  🗄️  Deploying TimescaleDB..."
    kubectl apply -f ../infrastructure/timescaledb/deployment.yaml
    
    # Deploy Consul
    echo "  🔍 Deploying Consul..."
    kubectl apply -f ../infrastructure/consul/deployment.yaml
    
    echo "✅ Infrastructure deployed"
}

# Function to wait for infrastructure
wait_for_infrastructure() {
    echo "⏳ Waiting for infrastructure to be ready..."
    
    kubectl wait --for=condition=ready pod -l app=rabbitmq -n arbitrage-bot --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n arbitrage-bot --timeout=300s
    kubectl wait --for=condition=ready pod -l app=timescaledb -n arbitrage-bot --timeout=300s
    kubectl wait --for=condition=ready pod -l app=consul -n arbitrage-bot --timeout=300s
    
    echo "✅ Infrastructure is ready"
}

# Function to deploy services
deploy_services() {
    echo "🎯 Deploying microservices..."
    
    kubectl apply -f ../k8s/services/scanner/deployment.yaml
    kubectl apply -f ../k8s/services/pathfinding/deployment.yaml
    kubectl apply -f ../k8s/services/ml/deployment.yaml
    kubectl apply -f ../k8s/services/execution/deployment.yaml
    kubectl apply -f ../k8s/services/analytics/deployment.yaml
    kubectl apply -f ../k8s/services/bridge/deployment.yaml
    kubectl apply -f ../k8s/services/dashboard/deployment.yaml
    
    echo "✅ Microservices deployed"
}

# Function to deploy monitoring
deploy_monitoring() {
    echo "📊 Deploying monitoring stack..."
    
    kubectl apply -f ../k8s/monitoring/prometheus-deployment.yaml
    kubectl apply -f ../k8s/monitoring/grafana-deployment.yaml
    kubectl apply -f ../k8s/monitoring/jaeger-deployment.yaml
    
    echo "✅ Monitoring stack deployed"
}

# Function to deploy ingress
deploy_ingress() {
    echo "🌐 Deploying ingress..."
    kubectl apply -f ../k8s/ingress/ingress.yaml
    echo "✅ Ingress deployed"
}

# Function to verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    echo ""
    echo "Pods status:"
    kubectl get pods -n arbitrage-bot
    
    echo ""
    echo "Services:"
    kubectl get svc -n arbitrage-bot
    
    echo ""
    echo "HPA status:"
    kubectl get hpa -n arbitrage-bot
    
    echo ""
    echo "✅ Deployment verification complete"
}

# Function to display access info
display_access_info() {
    echo ""
    echo "======================================"
    echo "🎉 Deployment Complete!"
    echo "======================================"
    echo ""
    echo "Access your services:"
    echo ""
    echo "Dashboard: http://dashboard.arbitrage.bot"
    echo "API: http://api.arbitrage.bot"
    echo "Grafana: http://$(kubectl get svc grafana -n arbitrage-bot -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3000"
    echo "Prometheus: http://$(kubectl get svc prometheus -n arbitrage-bot -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):9090"
    echo "Jaeger: http://$(kubectl get svc jaeger -n arbitrage-bot -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):16686"
    echo "RabbitMQ Management: http://$(kubectl get svc rabbitmq-management -n arbitrage-bot -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):15672"
    echo ""
    echo "Monitoring commands:"
    echo "  kubectl get pods -n arbitrage-bot -w"
    echo "  kubectl logs -f -n arbitrage-bot -l app=scanner"
    echo "  kubectl top pods -n arbitrage-bot"
    echo ""
}

# Main deployment flow
main() {
    echo "======================================"
    echo "  Arbitrage Bot Deployment Script"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region: $REGION"
    echo "======================================"
    echo ""
    
    check_kubectl
    check_helm
    create_namespace
    apply_secrets
    apply_configmaps
    deploy_infrastructure
    wait_for_infrastructure
    deploy_services
    deploy_monitoring
    deploy_ingress
    
    sleep 10
    
    verify_deployment
    display_access_info
}

# Run main function
main
