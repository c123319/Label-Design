# Label Design - 标签设计工具

批量生成证书/标签的在线工具。支持可视化模板编辑、批量数据导入、条码/二维码渲染，一键批量导出图片或 PDF。

## 技术栈

| 层     | 技术                                        |
| ------ | ------------------------------------------- |
| 前端   | React 18 + TypeScript + Vite               |
| 画布   | Fabric.js                                   |
| UI     | Ant Design                                  |
| 状态   | Zustand                                     |
| 后端   | NestJS + TypeScript                         |
| 数据库 | Prisma ORM (SQLite 内嵌 / 可切 PostgreSQL)  |
| 渲染   | node-canvas + pdfkit                        |
| 结构   | Monorepo (npm workspaces)                   |

## 项目结构

```
Label-Design/
├── client/          # 前端 React 应用
├── server/          # 后端 NestJS 应用
├── shared/          # 前后端共享类型定义
├── docs/            # 项目文档
└── package.json     # Monorepo 根配置
```

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动前端（端口 5173）
npm run dev:client

# 启动后端（端口 3000，首次启动自动应用数据库 migration）
npm run dev:server
```

### 数据库

后端使用 Prisma ORM，默认内嵌 SQLite（零依赖，数据库文件在 `server/prisma/dev.db`）。

```bash
# 修改 schema 后生成迁移
cd server && npm run prisma:migrate -- --name <变更说明>

# 可视化查看/编辑数据
cd server && npm run prisma:studio

# 重置数据库（清空数据）
cd server && npm run db:reset
```

切换到 PostgreSQL：编辑 `server/prisma/schema.prisma` 将 `provider = "postgresql"`，并把 `.env` 的 `DATABASE_URL` 改为 `postgresql://user:pass@host:5432/label_design`，再执行 `npm run prisma:migrate`。

### 构建

```bash
npm run build
```

## 核心功能

- **模板设计** — 拖拽文字、图片、条码、二维码、形状，支持旋转/缩放/层级控制
- **占位符** — 使用 `{{field_name}}` 语法定义动态字段
- **批量导入** — 上传 CSV / Excel / JSON 文件，自动映射字段
- **批量生成** — 一键生成 1000+ 标签，支持进度查询
- **多页模板** — 支持多页设计，页面复制/删除/切换
- **导出** — PNG / JPG / PDF，支持 ZIP 打包下载
- **双源模板库** — 同时支持 GitHub 仓库与自部署后端的模板 / 素材加载

## 模板库与素材源

模板和素材支持两个数据源，前端可同时启用：

| 源 | 用途 | 配置 |
| --- | --- | --- |
| **GitHub 仓库**（默认） | 官方公共模板 / 素材，静态托管 | `VITE_TEMPLATE_STORE_BASE_URL` |
| **自部署后端**（可选） | 私有模板 / 素材，存在数据库，可后续加管理后台 | `VITE_BACKEND_STORE_BASE_URL` |

### 自部署后端源

部署后端服务（`npm run dev:server`）后，前端默认同源即可访问。分离部署时：

```bash
# client/.env
VITE_BACKEND_STORE_BASE_URL=https://api.example.com
```

启用后：
- 模板管理弹窗新增「🔒 私有模板库」Tab
- 素材面板顶部出现「官方素材 / 私有素材」切换

后端接口（只读，数据由部署方写库或后续管理端填充）：

| 接口 | 说明 |
| --- | --- |
| `GET /api/store/manifest` | 模板清单（对齐 GitHub manifest.json） |
| `GET /api/store/categories` | 分类列表 |
| `GET /api/store/templates/:id` | 单个模板 JSON |
| `GET /api/store/assets-manifest` | 素材清单 |

## API 概览

| 接口       | 方法 | 说明         |
| ---------- | ---- | ------------ |
| /api/templates   | POST/GET/PUT/DELETE | 模板 CRUD + 绑定 |
| /api/templates/:id/bindings | POST | 保存元素绑定 |
| /api/templates/:id/data-source | PUT | 设置模板默认数据源 |
| /api/data-sources/upload-json | POST | 上传批量数据 |
| /api/render/jobs | POST | 创建渲染任务 |
| /api/render/jobs/:jobId | GET | 查询任务进度 |
| /api/render/jobs/:jobId/download | GET | 下载 ZIP |
| /api/store/manifest | GET | 私有模板库清单 |
| /api/store/templates/:id | GET | 私有模板内容 |
| /api/store/assets-manifest | GET | 私有素材库清单 |

## License

Private
