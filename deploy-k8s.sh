#!/bin/bash
# ============================================================
# Weekly Report - Kubernetes Deployment Script
# ============================================================
# Usage:
#   ./deploy-k8s.sh          Deploy all resources
#   ./deploy-k8s.sh build    Build images + deploy
#   ./deploy-k8s.sh delete   Remove all resources
# ============================================================

set -e

NAMESPACE="weekly-report"
K8S_DIR="$(dirname "$0")/k8s"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- Delete Mode ----
if [ "$1" == "delete" ]; then
    log_warn "Deleting all Weekly Report resources from Kubernetes..."
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    log_info "All resources deleted."
    exit 0
fi

# ---- Build Mode ----
if [ "$1" == "build" ]; then
    log_info "Building Docker images..."

    # For minikube: use minikube's Docker daemon
    if command -v minikube &> /dev/null; then
        log_info "Detected minikube - using minikube Docker daemon"
        eval $(minikube docker-env)
    fi

    docker build -t weekly-report-backend:latest -f Dockerfile.server .
    log_info "✅ Backend image built"

    docker build -t weekly-report-frontend:latest -f Dockerfile.client .
    log_info "✅ Frontend image built"
fi

# ---- Deploy ----
log_info "Deploying Weekly Report to Kubernetes..."

# 1. Namespace
log_info "Creating namespace..."
kubectl apply -f "$K8S_DIR/namespace.yaml"

# 2. Secrets
log_info "Creating secrets..."
kubectl apply -f "$K8S_DIR/postgres-secret.yaml"

# 3. ConfigMaps
log_info "Creating ConfigMaps..."
kubectl apply -f "$K8S_DIR/postgres-configmap.yaml"

# 4. Persistent Volume Claims
log_info "Creating PVCs..."
kubectl apply -f "$K8S_DIR/postgres-pvc.yaml"
kubectl apply -f "$K8S_DIR/uploads-pvc.yaml"

# 5. PostgreSQL
log_info "Deploying PostgreSQL..."
kubectl apply -f "$K8S_DIR/postgres-deployment.yaml"
kubectl apply -f "$K8S_DIR/postgres-service.yaml"

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
kubectl -n $NAMESPACE rollout status deployment/postgres --timeout=120s

# 6. Backend
log_info "Deploying Backend..."
kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
kubectl apply -f "$K8S_DIR/backend-service.yaml"

# Wait for Backend to be ready
log_info "Waiting for Backend to be ready..."
kubectl -n $NAMESPACE rollout status deployment/backend --timeout=180s

# 7. Frontend
log_info "Deploying Frontend..."
kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"
kubectl apply -f "$K8S_DIR/frontend-service.yaml"

# Wait for Frontend to be ready
log_info "Waiting for Frontend to be ready..."
kubectl -n $NAMESPACE rollout status deployment/frontend --timeout=120s

# 8. Ingress (optional - may fail if no ingress controller)
log_info "Applying Ingress..."
kubectl apply -f "$K8S_DIR/ingress.yaml" 2>/dev/null || log_warn "Ingress could not be applied (no ingress controller?)"

# ---- Summary ----
echo ""
echo "============================================================"
log_info "🎉 Weekly Report deployed successfully!"
echo "============================================================"
echo ""

# Show pod status
kubectl -n $NAMESPACE get pods -o wide
echo ""

# Show services
kubectl -n $NAMESPACE get services
echo ""

# Access info
FRONTEND_NODEPORT=$(kubectl -n $NAMESPACE get svc frontend -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30080")
log_info "Frontend NodePort: $FRONTEND_NODEPORT"

if command -v minikube &> /dev/null; then
    MINIKUBE_IP=$(minikube ip 2>/dev/null || echo "unknown")
    log_info "Access via: http://${MINIKUBE_IP}:${FRONTEND_NODEPORT}"
else
    log_info "Access via: http://localhost:${FRONTEND_NODEPORT}"
fi

echo ""
log_info "Useful commands:"
echo "  kubectl -n $NAMESPACE get pods          # Pod durumları"
echo "  kubectl -n $NAMESPACE logs <pod-name>   # Pod logları"
echo "  kubectl -n $NAMESPACE get all           # Tüm kaynaklar"
echo "  ./deploy-k8s.sh delete                  # Temizleme"
