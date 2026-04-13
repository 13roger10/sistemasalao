#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Belezza — Kubernetes deploy script
#
# Usage:
#   ./k8s/deploy.sh                      # apply everything
#   ./k8s/deploy.sh --only backend       # apply only backend manifests
#   ./k8s/deploy.sh --image-tag v1.2.3   # override image tag
#   ./k8s/deploy.sh --dry-run            # dry-run (server-side)
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
REGISTRY="${REGISTRY:-ghcr.io/belezza}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="belezza"
ONLY=""
DRY_RUN=""

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --image-tag)   IMAGE_TAG="$2";  shift 2 ;;
    --registry)    REGISTRY="$2";  shift 2 ;;
    --only)        ONLY="$2";       shift 2 ;;
    --dry-run)     DRY_RUN="--dry-run=server"; shift ;;
    *)             echo "Unknown argument: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# ── Image tag substitution ────────────────────────────────────────────────────
# Temporarily patches image fields in deployment YAMLs to use the given tag.
patch_images() {
  local dir="$1"
  # backend
  kubectl set image deployment/belezza-api \
    belezza-api="${REGISTRY}/belezza-api:${IMAGE_TAG}" \
    -n "${NAMESPACE}" ${DRY_RUN} 2>/dev/null || true
  # frontend
  kubectl set image deployment/belezza-frontend \
    belezza-frontend="${REGISTRY}/belezza-frontend:${IMAGE_TAG}" \
    -n "${NAMESPACE}" ${DRY_RUN} 2>/dev/null || true
}

# ── Full deploy ───────────────────────────────────────────────────────────────
deploy_all() {
  log "Applying namespace and infrastructure..."
  kubectl apply -f "${SCRIPT_DIR}/namespace.yaml" ${DRY_RUN}
  kubectl apply -f "${SCRIPT_DIR}/secrets.yaml"   ${DRY_RUN}
  kubectl apply -f "${SCRIPT_DIR}/configmap.yaml" ${DRY_RUN}

  log "Applying PostgreSQL..."
  kubectl apply -f "${SCRIPT_DIR}/postgres/" ${DRY_RUN}

  log "Applying Redis..."
  kubectl apply -f "${SCRIPT_DIR}/redis/" ${DRY_RUN}

  log "Waiting for postgres to be ready..."
  kubectl rollout status statefulset/postgres -n "${NAMESPACE}" --timeout=120s

  log "Applying Backend..."
  kubectl apply -f "${SCRIPT_DIR}/backend/" ${DRY_RUN}

  log "Applying Frontend..."
  kubectl apply -f "${SCRIPT_DIR}/frontend/" ${DRY_RUN}

  log "Applying Ingress..."
  kubectl apply -f "${SCRIPT_DIR}/ingress.yaml" ${DRY_RUN}

  if [[ "${IMAGE_TAG}" != "latest" ]]; then
    log "Patching image tags to ${IMAGE_TAG}..."
    patch_images
  fi

  log "Waiting for rollouts..."
  kubectl rollout status deployment/belezza-api      -n "${NAMESPACE}" --timeout=180s
  kubectl rollout status deployment/belezza-frontend -n "${NAMESPACE}" --timeout=120s

  log "Deploy complete."
  kubectl get pods -n "${NAMESPACE}"
}

# ── Partial deploy ────────────────────────────────────────────────────────────
deploy_only() {
  case "${ONLY}" in
    backend)
      log "Applying backend only..."
      kubectl apply -f "${SCRIPT_DIR}/backend/" ${DRY_RUN}
      [[ "${IMAGE_TAG}" != "latest" ]] && kubectl set image deployment/belezza-api \
        belezza-api="${REGISTRY}/belezza-api:${IMAGE_TAG}" -n "${NAMESPACE}" ${DRY_RUN}
      kubectl rollout status deployment/belezza-api -n "${NAMESPACE}" --timeout=180s
      ;;
    frontend)
      log "Applying frontend only..."
      kubectl apply -f "${SCRIPT_DIR}/frontend/" ${DRY_RUN}
      [[ "${IMAGE_TAG}" != "latest" ]] && kubectl set image deployment/belezza-frontend \
        belezza-frontend="${REGISTRY}/belezza-frontend:${IMAGE_TAG}" -n "${NAMESPACE}" ${DRY_RUN}
      kubectl rollout status deployment/belezza-frontend -n "${NAMESPACE}" --timeout=120s
      ;;
    infra)
      log "Applying infra only (postgres + redis)..."
      kubectl apply -f "${SCRIPT_DIR}/postgres/" ${DRY_RUN}
      kubectl apply -f "${SCRIPT_DIR}/redis/"    ${DRY_RUN}
      ;;
    *)
      echo "Unknown --only target: ${ONLY}. Valid: backend | frontend | infra"
      exit 1
      ;;
  esac
  log "Partial deploy (${ONLY}) complete."
}

# ── Entry point ───────────────────────────────────────────────────────────────
if [[ -n "${ONLY}" ]]; then
  deploy_only
else
  deploy_all
fi
