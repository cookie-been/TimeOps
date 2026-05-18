# TimeOps

TimeOps 是一个面向软件厂商交付团队的企业级运维平台，用于在客户采购产品后，统一管理客户资产、部署目标、版本发布、远程运维任务、权限与审计。

当前仓库已经形成可运行的企业级后台成品，核心业务模块已经补齐完整 CRUD、归档恢复、权限控制、审计留痕与长期可维护性。

## 已实现范围

- 账号登录、JWT 鉴权、RBAC 基础
- 客户管理
- 服务器管理与 SSH 凭据 AES-GCM 加密存储
- 产品模板与标准动作编排
- 产品模板动作支持 `SCRIPT / STEP` 两种模式
- 模板页支持分别启用和编辑 `DEPLOY / UPDATE / BACKUP / ROLLBACK / VERIFY / RESTART` 动作
- Git / 发布包版本管理
- 部署实例建模与配置合并
- 5 个核心模块统一支持
  - 新增 / 列表 / 查询 / 编辑
  - 归档 / 恢复
  - `ACTIVE / ARCHIVED / ALL` 状态筛选
  - 归档后业务唯一键复用
  - 恢复冲突拦截
- 任务中心
  - 发起部署
  - 发起更新
  - 发起备份
  - 发起回滚
  - 发起验证
  - 发起重启
  - 发起高风险临时命令
  - 任务状态与输出查看
- 审计日志记录与敏感信息脱敏
- 中文企业后台前端界面
- Docker Compose 一键启动

## 技术栈

- 前端：React 18、TypeScript、Vite、Ant Design
- 后端：Java 17、Spring Boot 3、Spring Security、Spring Data JPA、Flyway
- 数据库：PostgreSQL（测试环境使用 H2 PostgreSQL 兼容模式）
- 安全：JWT、BCrypt、AES-GCM

## 模块说明

- `customer`：客户管理
- `server`：服务器与凭据加密
- `template`：产品模板与模板动作
- `release`：发布版本
- `instance`：部署实例与配置合并
- `task`：部署、更新、备份、回滚、验证、重启、临时命令任务
- `audit`：审计日志与输出脱敏
- `security` / `user`：认证与权限基础

## 主要接口

核心模块列表接口默认只返回 `ACTIVE` 记录，支持 `?status=ACTIVE|ARCHIVED|ALL`。

### 认证

- `POST /api/auth/login`

### 客户与服务器

- `GET /api/customers`
- `GET /api/customers/{customerId}`
- `POST /api/customers`
- `PUT /api/customers/{customerId}`
- `PATCH /api/customers/{customerId}/archive`
- `POST /api/customers/{customerId}/restore`
- `GET /api/servers`
- `GET /api/servers/{serverId}`
- `POST /api/servers`
- `PUT /api/servers/{serverId}`
- `PATCH /api/servers/{serverId}/archive`
- `POST /api/servers/{serverId}/restore`

### 模板与版本

- `GET /api/templates`
- `GET /api/templates/{templateId}`
- `POST /api/templates`
- `PUT /api/templates/{templateId}`
- `PATCH /api/templates/{templateId}/archive`
- `POST /api/templates/{templateId}/restore`
- `GET /api/releases`
- `GET /api/releases/{releaseId}`
- `POST /api/releases`
- `PUT /api/releases/{releaseId}`
- `PATCH /api/releases/{releaseId}/archive`
- `POST /api/releases/{releaseId}/restore`

### 部署实例

- `GET /api/instances`
- `POST /api/instances`
- `GET /api/instances/{instanceId}`
- `PUT /api/instances/{instanceId}`
- `PATCH /api/instances/{instanceId}/archive`
- `POST /api/instances/{instanceId}/restore`

### 运维任务

- `POST /api/tasks/adhoc`
- `POST /api/tasks/deploy`
- `POST /api/tasks/update`
- `POST /api/tasks/backup`
- `POST /api/tasks/rollback`
- `POST /api/tasks/verify`
- `POST /api/tasks/restart`
- `GET /api/tasks`

### 交付动作与 `STEP` 执行

- 模板动作现在支持 `SCRIPT` 和 `STEP` 两种模式。
- 前端模板页可以分别启用并编辑部署、更新、备份、回滚、验证、重启动作。
- `SCRIPT` 模式直接保存 shell 脚本内容。
- `STEP` 模式当前支持以 JSON 形式定义单步执行脚本，例如：

```json
{
  "script": "./ops/update.sh",
  "useMergedConfigEnv": true,
  "useReleaseVersion": true,
  "useReleaseGitRef": true,
  "useInstanceEnvironment": true
}
```

- `STEP` 执行时会自动复用模板默认目录，并可注入：
  - 实例合并配置
  - 发布版本号 `RELEASE_VERSION`
  - 发布 Git 引用 `RELEASE_GIT_REF`
  - 实例环境 `INSTANCE_ENV`

### 典型交付任务

- `DEPLOY`：按模板部署动作执行版本发布
- `UPDATE`：按模板更新动作执行版本升级
- `BACKUP`：按模板备份动作执行数据或文件备份
- `ROLLBACK`：按模板回滚动作执行版本回退
- `VERIFY`：按模板验证动作执行发布后核验
- `RESTART`：按模板重启动作执行服务重启
- `ADHOC_COMMAND`：直接对服务器执行一次性高风险命令

### 审计

- `GET /api/audit-logs`

### 用户与角色

- `GET /api/users`

## 默认管理员

- 用户名：`admin`
- 密码：`Admin@123`

本地测试和 Docker 示例默认使用同一套初始化管理员账号。

## 本地开发

### 1. 启动后端

复制环境变量模板：

```bash
cp backend/.env.example backend/.env
```

加载环境变量后启动：

```bash
cd backend
set -a
source .env
set +a
mvn spring-boot:run
```

后端默认地址：

- `http://localhost:8080`

### 2. 启动前端

复制前端环境变量模板：

```bash
cp frontend/.env.example frontend/.env
```

启动前端开发服务器：

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：

- `http://localhost:5173`

开发环境默认通过 Vite 代理把 `/api` 转发到 `http://localhost:8080`。

## 测试与构建

### 后端

```bash
cd backend
mvn test
mvn clean package
```

### 前端

```bash
cd frontend
npm install
npm test
npm run build
```

## 环境变量说明

### 后端 `backend/.env.example`

- `TIMEOPS_DB_HOST`：数据库主机
- `TIMEOPS_DB_PORT`：数据库端口
- `TIMEOPS_DB_NAME`：数据库名
- `TIMEOPS_DB_USERNAME`：数据库用户名
- `TIMEOPS_DB_PASSWORD`：数据库密码
- `TIMEOPS_INITIAL_ADMIN_PASSWORD_HASH`：初始化管理员密码哈希
- `TIMEOPS_CRYPTO_SECRET`：Base64 编码的 AES 密钥
- `TIMEOPS_JWT_SECRET`：Base64 编码的 JWT HMAC 密钥
- `TIMEOPS_JWT_EXPIRATION_SECONDS`：JWT 过期时间，默认 `86400`

### 前端 `frontend/.env.example`

- `VITE_API_BASE_URL`：前端请求后端 API 的基地址，默认建议为 `/`

## Docker Compose

直接在仓库根目录启动：

```bash
docker compose up -d --build
```

启动后访问：

- 前端：`http://localhost`
- 后端：`http://localhost:8080`

默认 compose 保持 `simulated` 模式，适合本地演示、前后端联调和无 SSH 目标环境。

### 独立 real SSH 演示栈

如果你要直接验证真实 SSH 执行链路，可以启动单独的演示栈：

```bash
docker compose -f docker-compose.real-ssh.yml up -d --build
```

启动后访问：

- 前端：`http://localhost:8088`
- 后端：`http://localhost:8081`

这个演示栈不会覆盖默认主环境，使用独立容器、独立数据卷和独立端口。

演示栈内置一个可直接用于任务验证的 SSH 目标，创建服务器时填：

- Host：`ssh-target`
- Port：`2222`
- Username：`tester`
- Password：`Passw0rd123!`

关闭演示栈：

```bash
docker compose -f docker-compose.real-ssh.yml down -v
```

## SSH 执行模式

后端支持两种任务执行模式：

- `simulated`：默认模式，用于本地开发、测试和 Docker Compose 示例
- `real`：通过真实 SSH 用户名密码连接目标主机并执行命令

切换方式：

```bash
export TIMEOPS_SSH_MODE=real
```

可选参数：

- `TIMEOPS_SSH_CONNECT_TIMEOUT_MILLIS`
- `TIMEOPS_SSH_COMMAND_TIMEOUT_MILLIS`
- `TIMEOPS_SSH_STRICT_HOST_KEY_CHECKING`

默认仍然使用 `simulated`，这样本地和容器环境在没有可达 SSH 目标时也能完整跑通任务编排、审计和界面链路。
