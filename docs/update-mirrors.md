# 更新镜像配置

RendCore Harness 默认按顺序尝试两个已验证的镜像，然后回退到 GitHub Releases：`gh-proxy.com`、`ghfast.top`。安装版启动后会在后台检查，镜像只影响更新 feed，不影响 Harness、模型服务或 API 密钥。

## 配置文件

退出 RendCore Harness，在下面的位置新建或修改 `update-config.json`：

```text
%APPDATA%\\rendcore-harness\\update-config.json
```

示例：

```json
{
  "mirrors": [
    "https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/"
  ],
  "fallbackToGitHub": true
}
```

镜像地址必须是一个 generic update feed，并且能直接提供：

- `latest.yml`
- `latest.yml` 中列出的 Windows 安装包
- 对应的 `.blockmap` 文件

不同镜像站的 URL 格式可能不同，请以镜像站文档为准。也可以使用单个 `feedUrl`，或在 `mirrors` 中放多个地址；应用会按顺序尝试。`fallbackToGitHub` 默认为 `true`，所有镜像不可用时会自动回官方 GitHub Releases。

删除这个文件即可恢复内置镜像。把 `mirrors` 改为空数组即可跳过镜像、直接使用 GitHub。高级用户也可以设置环境变量 `RENDCORE_UPDATE_FEED_URL`，它会优先于文件中的地址。

配置在应用启动时读取，修改后重启 RendCore Harness 即可生效。
You can edit these feeds directly from the **Update mirror settings** button in the Harness sidebar. Changes are saved immediately and apply to the next update check.
