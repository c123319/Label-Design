# Template Store — 远程模板库

标签设计工具（Label Design）的远程静态资源仓库，存放模板清单、分类索引、模板 JSON、缩略图及公共素材。

前端通过 `templateStoreService` 服务层加载此仓库中的资源，开发环境由 Vite 中间件提供静态服务，生产环境可部署到 GitHub / Gitee / OSS。

---

## 目录结构

```
template-store/
├── manifest.json          # 模板库清单（前端首先加载，含版本号与模板列表）
├── categories.json        # 模板分类索引
├── assets-manifest.json   # 素材库清单（图标、合规标识、警示语、Logo、背景）
├── thumbnails/            # 模板缩略图（SVG）
│   ├── general_100x100.svg
│   ├── logistics_100x150.svg
│   ├── product_60x40.svg
│   ├── food_80x60.svg
│   ├── crossborder_100x70.svg
│   └── warehouse_50x30.svg
├── templates/             # 模板 JSON 文件（schemaVersion "1.0"）
│   ├── general_100x100.json
│   ├── logistics_100x150.json
│   ├── product_60x40.json
│   ├── food_80x60.json
│   ├── crossborder_100x70.json
│   └── warehouse_50x30.json
├── assets/                # 公共素材文件
│   ├── icons/             # 法案标 / 合规标识 SVG
│   │   ├── ce.svg
│   │   └── rohs.svg
│   ├── logos/             # Logo SVG
│   │   ├── company_logo.svg
│   │   └── certified.svg
│   └── backgrounds/       # 背景图 SVG
│       ├── white.svg
│       └── warning_yellow.svg
└── README.md
```

---

## 模板清单

当前版本：`2026-06-09.001`，共 6 个模板。

| 模板 ID | 名称 | 分类 | 尺寸 (mm) | 占位符字段 | 精选 |
|---------|------|------|-----------|-----------|------|
| `general_100x100` | 通用标签模板 | 通用 | 100×100 | `productName`, `spec`, `productionDate`, `serialNo` | ✓ |
| `logistics_100x150` | 物流面单 | 物流 | 100×150 | `receiverName`, `receiverPhone`, `receiverAddress`, `senderName`, `senderPhone`, `trackingNo` | ✓ |
| `product_60x40` | 商品条码标签 | 商品 | 60×40 | `productName`, `barcode`, `price`, `sku` | ✓ |
| `food_80x60` | 食品合格证 | 食品 | 80×60 | `productName`, `batchNo`, `productionDate`, `expiryDate`, `inspector` | |
| `crossborder_100x70` | 跨境警示标签 | 跨境 | 100×70 | `productName`, `sku`, `barcode` | ✓ |
| `warehouse_50x30` | 仓储库位标签 | 仓储 | 50×30 | `locationCode`, `zone`, `aisle`, `shelf` | |

---

## 分类

| code | name |
|------|------|
| featured | 精选 |
| general | 通用 |
| logistics | 物流 |
| product | 商品 |
| food | 食品 |
| crossborder | 跨境 |
| warehouse | 仓储 |

---

## 素材库

`assets-manifest.json` 版本：`2026-06-09.001`。

### 素材分类

| code | name | 素材数 |
|------|------|--------|
| icons | 法案标 | 6 |
| regulatory | 合规标识 | 20（含 18 个文本标签 + 2 个 SVG 图片） |
| warning | 跨境警示语 | 5 |
| logos | Logo | 2 |
| backgrounds | 背景 | 2 |

### 素材类型

- `label` — 短文本标签（如 CE、UKCA、RoHS 等）
- `text` — 多行警示语文本
- `image` — SVG/PNG 图片（引用 `assets/` 下的文件）

---

## 前端加载流程

### 服务层

| 文件 | 说明 |
|------|------|
| `client/src/config/templateStore.ts` | 仓库基础 URL 配置（GitHub 源 + 后端源） |
| `client/src/services/store/types.ts` | StoreProvider 接口抽象 |
| `client/src/services/store/githubProvider.ts` | GitHub 仓库源实现 |
| `client/src/services/store/backendProvider.ts` | 自部署后端源实现 |
| `client/src/services/store/index.ts` | 源调度层（listStoreSources / getStoreProvider） |
| `client/src/services/storeUtils.ts` | 源无关的筛选 / 搜索纯函数 |
| `client/src/services/templateStore.ts` | GitHub 源兼容封装（历史代码引用） |
| `client/src/hooks/useStore.ts` | 通用 Hook（useStoreTemplate / useStoreAssets，支持任意源） |
| `client/src/utils/convertStoreTemplate.ts` | template-store JSON → ITemplate 转换（mm→px、条码预渲染） |

### 类型定义

所有类型定义在 `shared/types/templateStore.ts`：

- `ITemplateStoreManifest` — 模板库清单
- `ITemplateStoreEntry` — 清单中的模板条目
- `ITemplateCategory` — 分类
- `IStoreTemplateFile` — 模板 JSON 文件（schemaVersion "1.0"）
- `IStoreTemplateObject` — 模板元素（text/barcode/qrcode/image/rect/circle/line）
- `IAssetsManifest` — 素材库清单
- `IAssetEntry` — 素材条目

### 加载时序

1. 前端通过 `templateStoreService.fetchManifest()` 加载 `manifest.json`
2. 通过 `templateStoreService.fetchCategories()` 加载 `categories.json`
3. 用户点击模板卡片时，通过 `templateStoreService.fetchTemplate()` 加载对应模板 JSON
4. 模板 JSON 经 `convertStoreTemplateToITemplate()` 转换（mm→px @ 300DPI、条码/二维码预渲染）
5. 缩略图 URL 由 `templateStoreService.getThumbnailUrl()` 拼接

### 缓存策略

- manifest 和 assets-manifest 使用 `sessionStorage` 缓存
- 同版本号时复用缓存，版本号变化时自动更新
- 支持 `force` 参数强制刷新

### 开发环境

Vite 通过自定义中间件（`client/vite.config.ts` 中的 `templateStorePlugin`）将 `template-store/` 目录映射到 `/template-store/` 路径。

---

## 模板 JSON 格式

模板文件使用 `schemaVersion: "1.0"` 格式，坐标单位为毫米（mm），前端加载时自动转换为画布像素（300 DPI）。

```json
{
  "schemaVersion": "1.0",
  "templateId": "general_100x100",
  "name": "通用标签模板",
  "category": "general",
  "canvas": {
    "width": 100,
    "height": 100,
    "unit": "mm",
    "background": "#FFFFFF",
    "gridSize": 2,
    "showGrid": true
  },
  "objects": [
    {
      "id": "el_text_title",
      "type": "text",
      "x": 8,
      "y": 8,
      "width": 84,
      "content": "产品名称：{{productName}}",
      "style": { "fontSize": 14, "fontWeight": "bold", "color": "#000000" },
      "binding": { "enabled": true, "fields": ["productName"] }
    },
    {
      "id": "el_barcode_sn",
      "type": "barcode",
      "barcodeType": "CODE128",
      "x": 8,
      "y": 55,
      "width": 70,
      "height": 15,
      "value": "{{serialNo}}",
      "showText": true,
      "binding": { "enabled": true, "fieldCode": "serialNo" }
    }
  ]
}
```

### 支持的元素类型

| type | 说明 | 关键字段 |
|------|------|----------|
| `text` | 文本 | `content`, `style` |
| `barcode` | 条形码 | `barcodeType` (CODE128/EAN13), `value` |
| `qrcode` | 二维码 | `value` |
| `image` | 图片 | `src` |
| `rect` | 矩形 | `style.fill`, `style.stroke` |
| `circle` | 圆形 | `style.fill`, `style.stroke` |
| `line` | 线条 | `style.stroke` |

### 数据绑定

使用 `{{field_name}}` 语法定义动态占位符，通过 `binding` 字段配置绑定：

- `fieldCode` — 绑定单个字段
- `fields` + `template` — 绑定多个字段到模板文本
- `defaultValue` — 默认值

---

## 部署方式

将整个目录上传到 GitHub / Gitee / OSS，前端通过环境变量配置仓库根 URL：

```bash
# GitHub Raw URL 示例
VITE_TEMPLATE_STORE_BASE_URL=https://raw.githubusercontent.com/xxx/template-store/main

# 本地开发（默认，由 Vite 静态服务提供）
# VITE_TEMPLATE_STORE_BASE_URL=/template-store
```

可选：配置域名白名单（空值表示不限制）：

```bash
VITE_TEMPLATE_STORE_ALLOWED_HOSTS=raw.githubusercontent.com,cdn.example.com
```

---

## 更新流程

1. 在 `templates/` 添加或修改模板 JSON
2. 在 `thumbnails/` 添加对应缩略图
3. 更新 `manifest.json` 中的 `version` 和模板列表
4. 在 `assets/` 添加素材文件，并更新 `assets-manifest.json`
5. 推送到远程仓库

---

## 与主项目的关系

| 主项目模块 | 与 template-store 的交互 |
|-----------|------------------------|
| `TemplateManager` 组件 | 模板库 Tab：加载 manifest + categories，展示模板卡片，点击加载到画布 |
| `Toolbar` 组件 | 素材面板：加载 assets-manifest，按分类展示素材，拖拽到画布 |
| `convertStoreTemplate.ts` | 格式转换：mm→px、条码/二维码预渲染、binding 映射 |
| `useTemplateStore` / `useAssetStore` | React Hook：封装加载状态、搜索、筛选 |
| `vite.config.ts` | 开发环境：自定义中间件提供 template-store 静态服务 |
