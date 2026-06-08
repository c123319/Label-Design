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

# 启动后端（端口 3000）
npm run dev:server
```

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

## API 概览

| 接口       | 方法 | 说明         |
| ---------- | ---- | ------------ |
| /api/templates   | POST | 保存模板     |
| /api/templates   | GET  | 查询模板列表 |
| /api/upload/data | POST | 上传批量数据 |
| /api/batch/generate | POST | 批量生成   |
| /api/batch/status/:jobId | GET | 查询进度 |
| /api/export/pdf  | POST | 导出 PDF     |
| /api/export/images | POST | 导出图片   |

## License

Private
