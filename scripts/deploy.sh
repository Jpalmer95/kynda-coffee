#!/bin/bash
set -e

# Kynda Coffee Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: production (default) | staging

ENV=${1:-production}
echo "=== Kynda Coffee Deployment: $ENV ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-flight checks
echo -e "${YELLOW}Step 1: Pre-flight checks${NC}"

if [ ! -f .env.local ]; then
  echo -e "${RED}ERROR: .env.local not found${NC}"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}ERROR: Node.js not found${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}ERROR: Node.js 18+ required (found $(node -v))${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"

# Step 2: Clean install
echo -e "${YELLOW}Step 2: Installing dependencies${NC}"
npm ci --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Type check and build
echo -e "${YELLOW}Step 3: Building application${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# Step 4: Git push (if on a branch)
echo -e "${YELLOW}Step 4: Git operations${NC}"
if [ -d .git ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
    echo "Current branch: $BRANCH"
    git add -A
    git commit -m "Deploy: $ENV build $(date -u +%Y-%m-%d_%H:%M:%S UTC)" || true
    git push origin "$BRANCH" || echo -e "${YELLOW}Warning: Push failed or no remote${NC}"
  fi
fi
echo -e "${GREEN}✓ Git operations complete${NC}"

# Step 5: Deployment summary
echo ""
echo -e "${GREEN}=== Deployment Ready ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Coolify will auto-deploy on push (if GitHub-connected)"
echo "  2. Or SSH to droplet and run: pm2 restart ecosystem.config.cjs"
echo "  3. Or build Docker image: docker build -t kynda-coffee ."
echo ""
echo "Environment: $ENV"
echo "Port: 3000"
echo ""
