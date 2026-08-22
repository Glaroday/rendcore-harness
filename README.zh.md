# RendCore Harness

RendCore Harness 是一个本地优先的桌面 Harness 客户端，支持 Windows x64、macOS Apple Silicon 和 macOS Intel。

它会自动启动本地 Harness，保存工作区、会话和插件，并通过在线模型服务工作。API 密钥由用户在应用设置中输入，仓库和安装包不内置密钥。

## 下载

从 [GitHub Releases](https://github.com/Glaroday/rendcore-harness/releases) 下载 macOS 或 Windows 安装包。

正式安装包会检查 `Glaroday/rendcore-harness` 的 GitHub Releases 更新源。开发版不会检查或安装生产版本更新。

## 本地开发

```bash
git clone https://github.com/Glaroday/rendcore-harness.git
cd rendcore-harness
npm install
npm run dev
```

质量检查：

```bash
npm test
npm run typecheck
npm run build
```

## 模型与插件

- 在线获取模型目录，不把模型列表硬编码成离线快照。
- 支持用户自定义 OpenAI-compatible API 地址和 API 密钥。
- 首次启动会自动准备 `dshmarket@latest` 插件市场和 ModSearch。
- 插件、会话和工作区保存在用户数据目录，升级安装包不会删除这些数据。

## 更新机制

发布工作流会把 Windows/macOS 安装包、`latest.yml`、macOS 更新元数据和 `.blockmap` 上传到 GitHub Release。已安装的 Windows/macOS 正式版使用 `electron-updater` 检查该 Release；发现新版本后后台下载，用户确认重启后安装。

## 许可证

本项目采用 [MIT License](LICENSE)。Harness 运行时及其依赖遵循各自的上游许可证和商标规则。
