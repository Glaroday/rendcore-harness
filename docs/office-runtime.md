# Desktop Office authoring

本改动属于 Profile 组合与后端激活阶段，不改客户端 bootstrap。普通 Profile 从安装 anchor 加载 `dsh-desktop-office`，组合上游 `dsh-skill-office` 与 `dsh-tool-workspace-dependencies`。Safe Mode 不加载该可选插件，Python 或技能资源损坏时保留独立恢复入口。

资源从当前 Desktop 的 `resources/office-runtime` 读取；开发时读取 `.build/office-runtime`。技能和 Python 必须在 ASAR 外，不能从中立 launch-root、Profile 或用户项目查找。依赖查询直接返回当前安装携带的只读 Python 路径，不复制到用户 Profile，不修改 PATH；升级后重新查询即使用新安装路径。LibreOffice CLI 使用 #646 的 Electron Helper / Electron executable 的 Node 模式与固定 CLI 入口，保留引擎物理路径解析。

Python 和 wheel 的固定 URL/SHA-256 来源：[上游固定提交的 primary-runtime lock](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/scripts/primary-runtime/lock.json)。本仓库仅保留 Windows x64、macOS arm64/x64 的 Python 相关输入；不携带第二份 Node 或 pnpm。新增 tar / fflate 为构建时提取工具，不增加 renderer 依赖。

构建阶段下载并校验固定资源、离线解包 wheel，不运行 pip install，不依赖系统 Python。生成物位于忽略目录 `.build`；构建失败不能继续消费旧 payload。包内验证必须实际调用 Python 创建、重新读取 DOCX/PPTX/XLSX、检查 ZIP 正斜杠路径，执行技能结构检查及 LibreOffice 转换。Windows 和 Intel Mac 的执行验收须在对应原生 runner 完成；其他平台的成功不可替代。

本地 macOS arm64 开发目录包实测 Office 资源约 205 MiB（包含 Python、numpy/pandas 与 Office 库）；这不是 DMG/NSIS 压缩增量。首次运行不做联网安装或 Profile 复制；安装时间增量取决于目标安装器的解压，需要原生产物对照测量。
