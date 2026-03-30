#!/bin/bash

# 配置阿里云 Docker 镜像加速器
# 使用方法：./setup-docker-mirror.sh

echo "🔧 配置 Docker 镜像加速器..."

# 1. 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 2. 写入镜像加速地址（替换为你的地址）
cat | sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://atmhzs3o.mirror.aliyuncs.com"]
}
EOF

# 3. 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# 4. 验证配置
echo "✅ 配置完成，正在验证..."
if docker info | grep -q "atmhzs3o.mirror.aliyuncs.com"; then
    echo "✅ Docker 镜像加速器配置成功！"
    docker info | grep -A2 "Registry Mirrors"
else
    echo "⚠️ 配置可能未生效，请检查配置文件："
    cat /etc/docker/daemon.json
fi

echo ""
echo "🚀 现在可以重新构建项目了："
echo "   cd /root/self-first-langchain-claude-agent/web-chat"
echo "   docker compose up -d --build"
