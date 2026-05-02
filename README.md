![构建状态](https://img.shields.io/github/actions/workflow/status/meswarm/web-markdown/ci.yml?branch=main&label=构建状态)
![最新版本](https://img.shields.io/github/v/release/meswarm/web-markdown?label=最新版本)
![许可证](https://img.shields.io/github/license/meswarm/web-markdown?label=许可证)

[![语言-中文](https://img.shields.io/badge/语言-中文-red)](README.md)
[![Language-English](https://img.shields.io/badge/Language-English-blue)](README_EN.md)

# Web Markdown Editor

> 具有本地文件系统和多媒体支持的所见即所得 Markdown 编辑器

这是一个基于 React 和 Milkdown 构建的现代 Markdown 编辑器，支持完整的所见即所得编辑体验、本地媒体预览（图片与视频），并利用 File System Access API 实现直接读取和保存本地文件。

## 功能特性

- 本地 vault 文件夹读取、编辑与保存
- 渲染模式与源码模式切换
- 图片、视频、音频分类复制与预览
- 图片双击灯箱查看
- 代码块折叠与长命令自动换行
- NoteSys 笔记整理、图片语义提取与分类存储
- ragdata 相关笔记检索

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 框架 | React, Vite |
| Markdown 引擎 | Milkdown |
| 存储 & API | IndexedDB (idb-keyval), File System Access API, NoteSys, ragdata |
| 样式 | Tailwind CSS |

## 快速开始

### 前置要求

- Node.js >= 18
- npm / pnpm / yarn

### 安装

```bash
git clone https://github.com/meswarm/web-markdown.git
cd web-markdown
npm install
```

### 配置

项目使用 `.env.example` 提供本地后端地址模板，复制后按环境修改：

```bash
cp .env.example .env
```

默认包含：

- `VITE_NOTESYS_API_BASE`
- `VITE_RAGDATA_API_BASE`

`.env` 包含本地地址，不要提交到 Git。

### 本地运行

```bash
npm run dev
```

## 项目结构

```
.
├── src/
│   ├── components/       # React 组件 (包括编辑器、侧边栏、工具栏)
│   ├── plugins/          # Milkdown 插件扩展 (如媒体插件等)
│   ├── App.tsx           # 应用入口及布局
│   └── ...
├── public/               # 静态资源
└── index.html            # Html 模板
```

## 使用方法

启动后即可在浏览器中体验 Markdown 编辑功能：

1. 使用左侧边栏管理文件。
2. 在编辑器中输入 Markdown 内容并实时预览。
3. 利用工具栏进行快捷操作和文件保存。

```bash
npm run build   # 构建生产环境
npm run preview # 预览生产环境构建
```

## 发布前检查

```bash
npm run build
node test-code-block-line-wrapping-config.js
node test-code-block-wrap-css.js
node test-editor-image-css.js
node --experimental-strip-types test-markdown-media-reference-preservation.js
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/your-feature`)
3. 提交更改 (`git commit -m 'feat: add your feature'`)
4. 推送分支 (`git push origin feat/your-feature`)
5. 发起 Pull Request

## 许可证

MIT — 详见 [LICENSE](LICENSE)。
