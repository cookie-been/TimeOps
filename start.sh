#!/bin/bash
# TimeOps 一键启动脚本
# 在 WSL 终端中执行: bash start.sh

set -e

cd "$(dirname "$0")"

echo "=== TimeOps 服务启动 ==="

# 设置环境变量
export TIMEOPS_DB_NAME="${TIMEOPS_DB_NAME:-timeops}"
export TIMEOPS_DB_USERNAME="${TIMEOPS_DB_USERNAME:-timeops}"
export TIMEOPS_DB_PASSWORD="${TIMEOPS_DB_PASSWORD:-timeops}"
export TIMEOPS_CRYPTO_SECRET="${TIMEOPS_CRYPTO_SECRET:-MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=}"
export TIMEOPS_JWT_SECRET="${TIMEOPS_JWT_SECRET:-pWG2A+9W/uFdijn9Li2AEFzrQIMSsd85GPQJ0tw03YA=}"
export TIMEOPS_JWT_EXPIRATION_SECONDS="${TIMEOPS_JWT_EXPIRATION_SECONDS:-86400}"
export TIMEOPS_INITIAL_ADMIN_PASSWORD_HASH='$2b$12$tnb0qj6vbJ/aO9MGIFHgdO7t9Oghu9Erps0EG3rqA6n6/65NuXPX6'

echo ">> 停止旧容器..."
docker compose down 2>/dev/null || true

echo ">> 构建并启动服务..."
docker compose up -d --build

echo ""
echo ">> 等待服务就绪..."
sleep 5

echo ""
echo "=== 服务状态 ==="
docker compose ps

echo ""
echo "=== 访问地址 ==="
echo "  前端页面:  http://localhost"
echo "  后端 API:  http://localhost:8080"
echo "  健康检查:  http://localhost:8080/api/health"
echo ""
echo "  默认账号:  admin / Admin@123"
