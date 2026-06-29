# Kumo for Komari

[![Build theme](https://github.com/yuanhhs/komari-theme-kumo/actions/workflows/build.yml/badge.svg)](https://github.com/yuanhhs/komari-theme-kumo/actions/workflows/build.yml)

一款简洁、响应式的 [Komari](https://github.com/komari-monitor/komari) 监控主题，基于
**Next.js** 与 **[Cloudflare Kumo](https://kumo-ui.com)**（Cloudflare 的 React 设计系统，
Base UI + Tailwind CSS v4）构建。

它通过 Komari 的 **JSON-RPC2** 接口实时渲染你的服务器集群：顶部统计概览、网格 / 列表形式的
节点卡片（实时 CPU / 内存 / 磁盘 / 网络），以及每个节点的详情视图（负载、网络、延迟历史图表）。

![预览](.preview/preview.png)

## 功能特性

- **实时数据** —— 轮询 `common:getNodesLatestStatus`，实时展示 CPU / 内存 / 交换 / 磁盘 / 网络 / 在线时长。
- **两种布局** —— 响应式卡片**网格**与紧凑**列表**，支持搜索与分组筛选；网格每行可选 **4 / 5 列**。
- **节点卡片** —— 操作系统发行版图标 + 国家/地区国旗；底部三个**环形仪表**：↑ 上行、↓ 下行、到期倒计时
  （按计费周期填充，临近到期变琥珀/红色）。
- **毛玻璃主题** —— 可切换的半透明玻璃质感，覆盖卡片、页头、弹窗、筛选和输入控件，配合自定义背景效果更佳。
- **节点详情** —— 弹窗内含 CPU/内存、网络历史（ECharts）与延迟图表，时间范围可选（1h / 6h / 24h），
  以及完整的系统/账单信息；**无数据的指标（如温度）自动隐藏，不再显示占位符**。
- **主题外观** —— 浅色 / 深色 / 跟随系统，六种强调色，全部基于 Kumo 语义化 token
  （通过 `light-dark()` 自动暗色）。
- **自定义背景** —— 管理员可上传原图或填写图片路径，背景会保存到 Komari 的主题设置中。
- **国际化** —— 简体中文 + English，自动识别、可切换。
- **管理员可配置** —— 内置 Komari `managed` 配置（默认外观/视图/列数/界面质感/强调色、
  分组筛选、背景图、页脚备注）。

## 技术栈

| 方面     | 选型 |
| -------- | ---- |
| 框架     | Next.js 15（App Router，静态导出 → SPA） |
| UI       | `@cloudflare/kumo` + `@phosphor-icons/react` |
| 样式     | Tailwind CSS v4（仅用 kumo 语义化 token） |
| 图表     | ECharts（按需引入核心） |
| 图标     | `simple-icons`（系统发行版 Logo）+ flagcdn（国旗） |
| 数据获取 | SWR 轮询 + 带类型的 JSON-RPC2 客户端 |

## 环境要求

- 一台 Komari 服务端 **≥ 1.0.7**（提供 RPC2 接口）；`managed` 主题设置需要服务端 **≥ 1.0.5**。
- 本地开发需要 Node **≥ 20**。

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
```

前端始终请求**相对路径** `/api/rpc2`。开发环境下有一个小的路由处理器
（`app/api/rpc2/route.ts`）把它代理到线上的 Komari 实例，并改写 `Origin` 请求头
（线上服务端启用了来源白名单，直接用 localhost 请求会被 403 拒绝）。

指向你自己的实例：

```bash
KOMARI_DEV_TARGET=https://your-komari.example.com npm run dev
```

（默认目标地址写在 `app/api/rpc2/route.ts` 里。）

## 打包主题

```bash
npm run build:theme
```

会生成 **`komari-theme-kumo.zip`**。脚本流程：

1. 暂存仅开发用的路由处理器（路由处理器无法静态导出）；
2. 执行 `BUILD_EXPORT=true next build`（静态导出 → `out/`）；
3. 校验必需的 `<title>Komari Monitor</title>` / 描述占位符是否保留；
4. 组装 `theme/`（`komari-theme.json` + `dist/` + `preview.png`）并压缩为 zip。

## 安装到 Komari

1. 打开 Komari **管理后台 → 主题 / Themes**。
2. 上传 `komari-theme-kumo.zip`。
3. 启用 **Kumo**。

生产环境下主题由 Komari 部署在站点根目录，`/api/rpc2` 是同源请求，无需代理。

## 持续集成与发布

仓库已配置 GitHub Actions（`.github/workflows/build.yml`）：

- **每次更新自动构建**：推送到 `main`、PR 或手动触发时，自动跑 `npm ci` → 类型检查 →
  `npm run build:theme`，并把打好的 `komari-theme-kumo.zip` 作为构建产物（artifact）上传。
- **每次推送自动发包**：推送到 `main` 后，会按 15 进位规则创建正式 Release
  （如 `1.0.15` → `1.1.0`，`1.15.15` → `2.0.0`）并附上 zip；包内版本号与 Release 版本一致。
- **打标签正式发版**：推送 `X.Y.Z` 形式的标签时，自动创建对应版本的 GitHub Release 并附上 zip。
- **发布说明自动生成**：Release 内容会列出上一个版本到当前提交之间的所有提交，并显示贡献者头像；
  重新发布同一版本时也会同步更新说明和 zip。

```bash
git tag 1.0.0
git push origin 1.0.0      # 触发构建并发布带 zip 的 Release
```

## 主题设置（管理后台）

通过 `theme.manifest.json` 中的 `managed` 配置暴露，并从 `/api/public` 的 `theme_settings` 读回：

| 键 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `defaultAppearance` | select | `system` | 首次访问的浅色/深色模式 |
| `defaultView` | select | `grid` | 首次访问的布局 |
| `defaultColumns` | select | `4` | 网格视图宽屏下每行列数（4 / 5） |
| `cardStyle` | select | `solid` | 界面质感：实心 / 毛玻璃主题 |
| `defaultAccent` | select | `default` | 强调色 |
| `defaultLang` | select | `zh-CN` | 默认语言 |
| `enableGroupTabs` | switch | `true` | 显示分组筛选 |
| `overviewVisibility` | select | `show` | 显示或隐藏总览信息 |
| `backgroundUrl` | string | — | 页面背景图 |
| `backgroundBrightness` | select | `100` | 页面背景亮度 |
| `footerNote` | richtext | — | 显示在 Powered-by 上方的 HTML |

本地静态图片默认放在 `public/assets/`，在设置里使用 `/assets/文件名` 作为背景路径；
打包后该目录会保留为主题包内的 `dist/assets/`。

外观、语言、视图、列数、界面质感、总览显示、强调色、背景图片地址与背景亮度保存到 Komari 的
`theme_settings` 后随站点持久化，换浏览器也会生效；上传图片时会按原图读成 data URL 保存，不做压缩或格式转换。

## 项目结构

```
app/                         App Router：layout（标题/描述占位符）、page、globals.css
  api/rpc2/route.ts          仅开发用的代理（静态导出时移除）
components/
  dashboard.tsx              首页布局、背景图 / 动态壁纸渲染
  node-card.tsx              节点卡片、环形仪表和总流量展示
  node-list.tsx              列表视图
  node-detail-dialog.tsx     节点详情弹窗、系统信息、流量信息、延迟图表
  settings-dialog.tsx        主题设置、背景图 / 视频地址、上传与持久化
  stats-bar.tsx              顶部统计概览
  toolbar.tsx                搜索、分组、视图切换、设置入口
  background-brightness-*    背景亮度滑块及交互效果
  charts/                    ECharts 时间序列图表
  ui/                        通用 UI：卡片、徽章、进度、分段控制等
hooks/useKomari.ts           SWR hooks（实时轮询）
lib/
  rpc2.ts                    带类型的 JSON-RPC2 客户端（POST /api/rpc2）
  types.ts                   接口响应类型
  aggregate.ts               节点视图模型 + 统计 + 分组 + weight 排序
  background-media.ts        背景图片 / 视频资源识别
  file.ts                    背景图原图读取（→ data URL）
  format.ts                  字节 / 速率 / 在线时长 / 百分比 等格式化
  i18n.ts                    zh-CN + en 词典
  sanitize.ts                主题设置 URL / HTML 安全处理
  theme-settings.ts          解析 Komari 后端 theme_settings 默认配置
  traffic.ts                 按流量限制类型计算已用流量
scripts/package-theme.mjs    静态导出 + zip 打包
theme.manifest.json          komari-theme.json 源文件（版本号从 package.json 注入）
.preview/preview.png         README 与文档站使用的主题预览图
shutdown/                    节点详细界面截图与说明
```

## 设计说明

- 颜色**只用 Kumo token**（`bg-kumo-*`、`text-kumo-*`……），绝不使用原始 Tailwind 颜色或
  `dark:` 变体 —— 暗色模式是自动的。
- **单页**设计：节点详情是弹窗而非路由，因此静态导出保持为干净的 SPA，与 Komari 的
  index.html 回退机制兼容良好。
- `<title>Komari Monitor</title>` 与 `A simple server monitor tool.` 原样保留，以便 Komari
  在服务时替换为运营者自定义的站点标题/描述。
- 按主题规范要求，保留 `Powered by Komari Monitor.` 页脚。

## Thanks

- [linux.do 社区](https://linux.do/)
- [Cloudflare Kumo](https://kumo-ui.com/)
- [Komari](https://github.com/komari-monitor/komari)

## 许可证

MIT
