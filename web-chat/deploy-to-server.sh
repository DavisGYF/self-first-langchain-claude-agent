#!/bin/bash

# OCR项目部署脚本
# 使用方法: ./deploy-to-server.sh 服务器IP

set -e  # 任何命令失败就停止执行

if [ $# -eq 0 ]; then
    echo "使用方法: $0 服务器IP地址"
    echo "例如: $0 123.123.123.123"
    exit 1
fi

SERVER_IP=$1
PROJECT_NAME="ocr-project-2"\nGITHUB_REPO="https://github.com/DavisGYF/self-firstAgent"

echo "🚀 开始部署OCR项目到服务器 $SERVER_IP"

echo "📦 步骤1: 在服务器上创建项目目录..."
ssh root@$SERVER_IP "mkdir -p /home/$PROJECT_NAME && cd /home/$PROJECT_NAME"

echo "📥 步骤2: 克隆GitHub代码..."
ssh root@$SERVER_IP "cd /home/$PROJECT_NAME && git clone $GITHUB_REPO ."

echo "📋 步骤3: 复制部署配置文件..."
scp docker-compose-2.yml root@$SERVER_IP:/home/$PROJECT_NAME/
scp .env.production root@$SERVER_IP:/home/$PROJECT_NAME/.env.local

echo "🏗️ 步骤4: 构建Docker镜像..."
ssh root@$SERVER_IP "cd /home/$PROJECT_NAME && sudo docker-compose -f docker-compose-2.yml build"

echo "🚀 步骤5: 启动服务..."
ssh root@$SERVER_IP "cd /home/$PROJECT_NAME && sudo docker-compose -f docker-compose-2.yml up -d"

echo "✅ 步骤6: 检查服务状态..."
ssh root@$SERVER_IP "sudo docker-compose -f docker-compose-2.yml ps"

echo "🎉 部署完成！"
echo "📱 访问地址: http://$SERVER_IP:3001"
echo "📊 查看日志: ssh root@$SERVER_IP 'cd /home/$PROJECT_NAME && sudo docker-compose -f docker-compose-2.yml logs -f'"

echo "🔧 管理命令:"
echo "  停止服务: ssh root@$SERVER_IP 'cd /home/$PROJECT_NAME && sudo docker-compose -f docker-compose-2.yml down'"
echo "  重启服务: ssh root@$SERVER_IP 'cd /home/$PROJECT_NAME && sudo docker-compose -f docker-compose-2.yml restart ocr-app-2'"