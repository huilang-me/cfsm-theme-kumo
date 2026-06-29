# Kumo for CF-Server-Monitor

一款简洁、响应式的 [CF-Server-Monitor](https://github.com/huilang-me/cfsm-theme-kumo) 监控主题，由 [komari-theme-kumo](https://github.com/yuanhhs/komari-theme-kumo/) 改造而来

## 使用

### 开发

需要一个运行中的 CF-Server-Monitor 后端实例。

```bash
# 安装依赖
npm install

# 生成本地 HTTPS 证书（放到 .cert/ 目录）
# key.pem 和 cert.pem

# 启动开发服务器（https://localhost:3443）
npm run dev
```

开发服务器会代理 API 请求到后端，可通过 `CFSM_DEV_TARGET` 环境变量指定后端地址（默认 `http://localhost:3000`）。

### 构建

```bash
# 静态导出到 out/ 目录
npm run export
```

导出的静态文件可部署到 GitHub Pages、Cloudflare Pages 等任意静态托管。

### 部署

将 `out/` 目录的内容部署到静态托管，并在 CF-Server-Monitor 后台配置主题 URL 指向该地址。
