#!/bin/bash

# 英语管理平台生产环境部署脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "ALIYUN_ACCESS_KEY_ID"
        "ALIYUN_ACCESS_KEY_SECRET"
        "ALIYUN_SMS_TEMPLATE_CODE"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "缺少必要的环境变量: $var"
            exit 1
        fi
    done
    
    log_success "环境变量检查通过"
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."
    
    if [[ $DATABASE_URL == postgresql://* ]]; then
        # PostgreSQL 备份
        pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
        log_success "数据库备份完成"
    else
        log_warning "跳过数据库备份（非 PostgreSQL）"
    fi
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    docker build -t english-admin-backend:latest .
    log_success "Docker 镜像构建完成"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    docker run --rm \
        --env-file .env \
        english-admin-backend:latest \
        bun run db:deploy
    
    log_success "数据库迁移完成"
}

# 初始化数据库
seed_database() {
    log_info "初始化数据库..."
    
    docker run --rm \
        --env-file .env \
        english-admin-backend:latest \
        bun run seed
    
    log_success "数据库初始化完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    docker-compose up -d
    
    log_success "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 30
    
    # 检查 API 健康状态
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
    
    if [ "$response" = "200" ]; then
        log_success "健康检查通过"
    else
        log_error "健康检查失败，HTTP 状态码: $response"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "📋 部署信息:"
    echo "- API 地址: http://localhost:3001"
    echo "- Swagger 文档: http://localhost:3001/swagger"
    echo "- 健康检查: http://localhost:3001/health"
    echo ""
    echo "🔧 管理命令:"
    echo "- 查看日志: docker-compose logs -f app"
    echo "- 停止服务: docker-compose down"
    echo "- 重启服务: docker-compose restart"
    echo "- 更新服务: ./scripts/deploy.sh"
    echo ""
    echo "📊 监控信息:"
    echo "- 容器状态: docker-compose ps"
    echo "- 资源使用: docker stats"
    echo ""
    echo "🔐 默认账户:"
    echo "- 管理员: admin / admin123456"
    echo "- 测试商户: 测试商户 (M001)"
    echo "- 测试用户: 13800138002"
}

# 主函数
main() {
    log_info "开始部署英语管理平台..."
    
    # 检查 Docker 和 Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    # 检查 .env 文件
    if [ ! -f .env ]; then
        log_error "缺少 .env 文件，请复制 env.example 并配置"
        exit 1
    fi
    
    # 执行部署步骤
    check_env
    backup_database
    build_image
    run_migrations
    seed_database
    start_services
    health_check
    show_deployment_info
}

# 脚本入口
if [ "$1" = "help" ]; then
    echo "英语管理平台部署脚本"
    echo ""
    echo "用法:"
    echo "  ./scripts/deploy.sh        # 完整部署"
    echo "  ./scripts/deploy.sh help   # 显示帮助"
    echo ""
    echo "环境要求:"
    echo "- Docker 和 Docker Compose"
    echo "- 配置 .env 文件"
    echo "- 必要的环境变量"
    exit 0
fi

main "$@" 