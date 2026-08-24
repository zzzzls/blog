---
category:
claude_version: 2.1.133
created: 2026-06-08 09:51:23
modified: 2026-06-10 02:36:35
publish: true
tags: [claude]
title: plugin & market
---

Claude Code 的能力通常来自于:

|               | 解决什么问题                  |
| ------------- | ----------------------- |
| skill         | 可复用 SOP                 |
| agent         | 以专家视角处理问题               |
| hooks         | 生命周期自动化                 |
| .mcp.json     | 接入外部工具/外部数据             |
| .lsp.json     | 代码语义理解(跳定义, 查引用, 看类型错误) |
| monitors      | 持续看日志、状态、文件变化           |
| settings.json | 默认行为配置                  |

plugin 用于将上述内容打包到一起, 便于安装, 共享, 版本控制和分发

# plugin

一个标准的 plugin 结构如下:

```
my-plugin/
├── .claude-plugin/              # 元数据目录
│   └── plugin.json
├── skills/
│   └── code-review/
│       └── SKILL.md
├── agents/
│   └── security-reviewer.md
├── hooks/
│   └── hooks.json
├── .mcp.json
├── .lsp.json
├── monitors/
│   └── monitors.json
├── bin/                       # 添加到 PATH 的 plugin 可执行文件
│   └── helper-script          # 在 Bash tool 中可作为裸命令调用
├── settings.json
└── README.md
```

- `.claude-plugin` 目录下只放 `plugin.json`文件, 其他目录(skill, agent, hooks等) 必须在 plugin 根目录  
- plugin.json 是 metadata. 它的 name 会成为命名空间. 例如plugin叫 `my-first-plugin`,

## plugin 安装位置

| 范围        | 设置文件                          | 用例                       |
| --------- | ----------------------------- | ------------------------ |
| `user`    | `~/.claude/settings.json`     | 在所有项目中可用（默认）             |
| `project` | `.claude/settings.json`       | 通过版本控制共享的团队 plugins      |
| `local`   | `.claude/settings.local.json` | 项目特定的 plugins，gitignored |

## plugin 清单

> `.claude-plugin/plugin.json` 文件定义了 plugin 的元数据和配置

```json
{
  "name": "plugin-name",
  "displayName": "Plugin Name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "dependencies": [
    "helper-lib",
    { "name": "secrets-vault", "version": "~2.1.0" }
  ]
}
```

- name: 唯一必须字段, 用于命名空间. plugin 中的 `hello` skill 会变成 `/<name>:hello`
- 可以在 plugin 中包含其他字段(来自其他生态的元数据), Cluade Code 会忽略这些字段

## 环境变量

Claude Code 提供三个变量用以引用路径.

skill内容, agent内容, hook命令, mongitor命令 以及 MCP 或 LCP Server 配置中的这些变量会进行内联替换.

这些变量也作为环境变量导出到 hook 进程 或 MCP / LCP Server 子进程

- `${CLAUDE_PLUGIN_ROOT}`: plugin 安装目录的绝对路径
- `${CLAUDE_PLUGIN_DATA}`: plugin 状态的持久目录
- `${CLAUDE_PROJECT_DIR}`: plugin 项目根目录

使用示例:  

### hook.json

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}\"/scripts/process.sh"
          }
        ]
      }
    ]
  }
}
```

### mcp

```json
{
  "mcpServers": {
    "routines": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      "env": {
        "NODE_PATH": "${CLAUDE_PLUGIN_DATA}/node_modules"
      }
    }
  }
}
```

### 安装依赖到持久数据目录

> `${CLAUDE_PLUGIN_DATA}` 目录解析为 `~/.claude/plugins/data/{plugin-name}/`

此 `SessionStart` hook 在第一次运行时安装 `node_modules`，并在 plugin 更新 `package.json` 时再次安装

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
          }
        ]
      }
    ]
  }
}
```

## [CLI 命令](https://code.claude.com/docs/zh-CN/plugins-reference#cli-%E5%91%BD%E4%BB%A4%E5%8F%82%E8%80%83)

- `claude plugin init <name> [option]`: 在 ~/.claude/skills 中搭建一个新 plugin, 作为 {name}@skills-dir 加载，无需市场或安装步骤

- `claude plugin install <plugin> [options]`: 从可用市场安装 plugin

- `claude plugin uninstall <plugin> [options]`: 删除已安装的 plugin

- `claude plugin enable <plugin> [options]`: 启用 plugin

- `claude plugin disable <plugin> [options]`: 禁用 plugin

- `claude plugin update <plugin> [options]`: 更新 plugin

- `claude plugin list [options]`: 列出已安装的 plugin

## 快速开始

### 创建第一个插件

1. 创建插件目录: `mkdir my-first-plugin`
2. 创建插件清单: `my-first-plugin/.claude-plugin/plugin.json`

	```
	{
	  "name": "my-first-plugin",
	  "description": "my first plugin",
	  "version": "1.0.0",
	  "author": {
	    "name": "zzzzls"
	  }
	}
	```

3. 添加skill
	- 在插件中创建一个 skill 目录: `my-first-plugin/skills/hello`
	- 写入SKILL.md

		```makrdown
		---
		name: hello
		description: 向用户打招呼
		disable-model-invocation: true
		argument: [username]
		---
		
		以少女的口吻, 热情地向 "$username" 打招呼
		```

4. 测试你的插件
	- 运行 claude 以加载插件: `claude --plugin-dir ./my-first-plugin`
	- 尝试执行 skill: `/my-first-plugin:hello zzzzls`

### 本地测试你的插件

使用 `--plugin-dir / --plugin-url` 在开发期间测试插件
- 这会直接加载你的插件, 无需安装
- 若与市场中插件同名, 本地优先
- 修改插件文件后, 运行 `/reload-plugin` 刷新, 无需重启 claude

```bash
claude --plugin-dir ./my-first-plugin

# 添加多个插件
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two

# 支持zip压缩包
claude --plugin-dir ./my-first-plugin.zip   

# 加载url插件
claude --plugin-url https://example.com/my-plugin.zip --plugin-url https://example.com/other.zip
```

# 插件市场 (plugin marketplace)

安装一个公开的插件步骤如下:

1. 添加插件所属的市场(*类似一个软件源*): `/plugin marketplace add anthropics/skills`
2. 从该市场中安装插件: `/plugin install {插件名}@{市场名}`

plugin marketplace 本质是一个插件目录: 它告诉 Claude Code "有哪些 plugin、叫什么、从哪里拉取、版本是什么、元数据是什么"

为了将我们的插件分发给别人, 我们首先需要创建一个 marketplace

## 创建 marketplace

> 一个 marketplace 本质是一个 json 文件

在根目录中创建 `.claude-plugin/marketplace.json`, 此文件定义你的 marketplace 的名称, 所有者信息, 以及包含的 plugin 列表

```json
{
  "name": "company-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@example.com"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting on save",
      "version": "2.1.0",
      "author": {
        "name": "DevTools Team"
      }
    },
    {
      "name": "deployment-tools",
      "source": {
        "source": "github",
        "repo": "company/deploy-plugin"
      },
      "description": "Deployment automation tools"
    }
  ]
}
```

## 添加 marketplace

1. 从 github 添加
	- 要求: 仓库包含 `.claude-plugin/marketplace.json`
	- `/plugin marketplace add owner/repo`

2. 从其他git主机
	- https: `/plugin marketplace add https://gitlab.com/company/plugins.git`
	- ssh: `/plugin marketplace add git@gitlab.com:company/plugins.git`
	- 特定分支/标签: `/plugin marketplace add https://gitlab.com/company/plugins.git#v1.0.0`

3. 从本地路径
	- `/plugin marketplace add ./my-marketplace`
	- `/plugin marketplace add ./path/to/marketplace.json`

4. 从远程 url
	- `/plugin marketplace add https://example.com/marketplace.json`

## marketplace 结构

| 字段                  | 必填  | 类型     | 说明                                                                                                       |
| ------------------- | --- | ------ | -------------------------------------------------------------------------------------------------------- |
| name                | ✔   | string | Marketplace 标识符(全小写, `-`连接)                                                                              |
| owner               | ✔   | object | Marketplace 维护者信息                                                                                        |
| plugins             | ✔   | array  | 可用 plugin 列表                                                                                             |
| description         |     | string | 简短的 marketplace 描述                                                                                       |
| version             |     | string | Marketplace 清单版本                                                                                         |
| metadata.pluginRoot |     | string | 前置到相对 plugin 源路径的基目录（例如，`"./plugins"` 让你写 `"source": "formatter"` 而不是 `"source": "./plugins/formatter"`） |

### plugin 条目

> `plugins` 数组中的每个 plugin 条目描述一个 plugin 及其位置

| 字段             | 必填  | 类型             | 说明                                                                                         |
| -------------- | --- | -------------- | ------------------------------------------------------------------------------------------ |
| name           | ✔   | string         | plugin标识符(全小写, `-`连接), 作为安装名:`/plugin install my-plugin@marketplace`                       |
| source         | ✔   | string\|object | 从哪里获取 plugin, 见 [plugin 源](plugin%20&%20market.md#plugin%20源)                                                    |
| displayName    |     | string         | UI中显示的人类可读名称                                                                               |
| description    |     | string         | 简短的 plugin 描述                                                                              |
| version        |     | string         | Plugin 版本。如果设置（在此处或在 `plugin.json` 中），plugin 将固定到此字符串，用户仅在其更改时才会收到更新。省略以回退到 git commit SHA |
| defaultEnabled |     | boolean        | plugin 安装后是否启用 (默认 true)                                                                   |

### plugin 源

> plugin源告诉Claude Code 在 marketplace 中列出的每个 plugin 从哪里获取
>
> 一旦 plugin 被克隆或复制到本地, 它就会被复制到本地版本化 plugin 缓存中, 位置为: `~/.claude/plugins/cache`

> [!info] Marketplace源 与 plugin源
> - marketplace 源: 从哪里获取 martetplace.json 目录自身. 在用户运行 `/plugin marketplace add` 中设置
> - plugin源: 从哪里获取 marketplace 中列出的单个 plugin. 在 martetplace.json 内每个plugin条目的 source 字段设置

#### 1. 相对路径

对于位于同一存储库中的 plugin, 使用以 `./` 开头的路径

```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin"
}
```

- 路径相对于 marketplace 根目录解析, 而不是 `.claude-plugin` 目录, 不要使用 `../` 来引用 marketplace 根目录外的路径

#### 2. Github 仓库

```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo"
  }
}
```

可以固定到特定的分支、标签 或 提交

```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "ref": "v2.0.0",
    "sha": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
  }
}
```

#### 3. Git 存储库

> 支持 特定的分支、标签 或 提交

```json
{
  "name": "git-plugin",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git 或 git@github.com:owner/repo.git"
  }
}
```

#### 4. Git 子目录

> 支持 特定的分支、标签 或 提交

claude code 会使用稀疏部分克隆来仅获取该子目录, 降低贷款消耗

```json
{
  "name": "my-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/acme-corp/monorepo.git",
    "path": "tools/claude-plugin"
  }
}
```

#### 5. npm 包

```json
{
  "name": "my-npm-plugin",
  "source": {
    "source": "npm",
    "package": "@acme/claude-plugin"
  }
}
```

## 托管和分发 marketplace

### 使用 git 托管

Github 提供最简单的分发方法:
1. 创建存储库
2. 创建 marketplace 文件: `.claude-plugin/marketplace.json`
3. 其他用户安装: `/plugin marketplace add owner/repo`

其他 git 服务上托管:

```
/plugin marketplace add https://gitlab.com/company/plugins.git
```

### 分发前本地测试

```bash
claude plugin validate .   # 验证 marketplace JSON 语法
/plugin marketplace add ./my-local-marketplace
/plugin install test-plugin@my-local-marketplace
```

### 版本解析机制

claude code 会按如下优先级解析 plugin 的版本:
1. plugin 的 `plugin.json` 中的 `version`
2. plugin 的 marketplace 条目中的 `version`
3. plugin 源的 git 提交 SHA

对于 git 源类型 `github`、`url`、`git-subdir` 和 git 托管 marketplace 内的相对路径，你可以完全省略 `version`，每个新提交都被视为新版本

设置 `version` 会固定 plugin, 如果你推送新提交而不修改该字符串, 则 `/plugin update` 和自动更新会跳过该 plugin

### 为容器预填充plugins

对于容器镜像和 CI 环境, 你可以在构建时预填充 plugins 目录,无需在运行时克隆任何内容。

构建镜像时先安装 marketplace 和 plugin, 然后把 `/opt/claude-seed` 拷到镜像中，并设置 `CLAUDE_CODE_PLUGIN_SEED_DIR`. Claude Code 启动时会读取 seed 中的 marketplace 和 plugin cache

**构建阶段:**

```bash
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed \
  claude plugin marketplace add your-org/claude-plugins

CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed \
  claude plugin install repo-onboarding@company-tools
```

**运行阶段:**

```bash
export CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed
claude
```

默认行为:
- **只读**: 种子目录永远不会被写入, 因此种子 marketplace 的自动更新被禁用
- **种子条目优先**: 每次启动时, 种子中声明的 marketplaces 会覆盖用户配置中的任何匹配条目
- **阻止变更**: 针对种子管理的 marketplace 运行 `/plugin marketplace remove` 或 `/plugin marketplace update` 会失败，并提示你要求管理员更新种子镜像

## CLI 命令

- `claude plugin marketplace add <source> [options]`: 从 GitHub 存储库、git URL、远程 URL 或本地路径添加 marketplace
- `claude plugin marketplace list [options]`: 列出所有配置的 marketplaces。
- `claude plugin marketplace remove <name> [options]`: 删除配置的 marketplace
- `claude plugin marketplace update [name]`: 从其源刷新 marketplaces

```bash

claude plugin marketplace add acme-corp/claude-plugins

claude plugin marketplace add https://gitlab.example.com/team/plugins.git

claude plugin marketplace add https://example.com/marketplace.json

claude plugin marketplace add ./my-marketplace

claude plugin marketplace add acme-corp/claude-plugins --scope project

```

# 参考

- [Plugins 参考](https://code.claude.com/docs/zh-CN/plugins-reference)
- [创建 plugins](https://code.claude.com/docs/zh-CN/plugins)
- [discover-plugins](https://code.claude.com/docs/zh-CN/discover-plugins)
- [plugin-marketplaces](https://code.claude.com/docs/zh-CN/plugin-marketplaces)
