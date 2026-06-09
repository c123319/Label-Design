# Template Store — 远程模板库

标签设计工具的远程静态资源仓库，包含模板清单、分类、模板 JSON、缩略图和公共素材。

## 目录结构

```
template-store/
├── manifest.json       # 模板库清单（前端首先加载）
├── categories.json     # 分类信息
├── thumbnails/         # 模板缩略图
├── templates/          # 模板 JSON 文件
├── assets/             # 公共素材（logo、图标、背景）
│   ├── logos/
│   ├── icons/
│   └── backgrounds/
└── README.md
```

## 部署方式

将整个目录上传到 GitHub / Gitee / OSS，前端通过环境变量配置仓库根 URL：

```bash
# GitHub Raw URL 示例
VITE_TEMPLATE_STORE_BASE_URL=https://raw.githubusercontent.com/xxx/template-store/main

# 本地开发（默认，由 Vite 静态服务提供）
# VITE_TEMPLATE_STORE_BASE_URL=/template-store
```

## 更新流程

1. 在 `templates/` 添加或修改模板 JSON
2. 在 `thumbnails/` 添加对应缩略图
3. 更新 `manifest.json` 中的 `version` 和模板列表
4. 推送到远程仓库

## 模板 JSON 格式

模板文件使用 `schemaVersion: "1.0"` 格式，坐标单位为毫米（mm）。前端加载时自动转换为画布像素（300 DPI）。

详见项目文档 `docs/远程静态资源仓库.md`。
