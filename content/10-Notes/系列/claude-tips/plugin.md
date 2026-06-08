---
category:
claude_version: 2.1.133
created: 2026-06-08 09:51:23
modified: 2026-06-09 01:38:04
publish: true
tags: [claude]
title: plugin
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

Claude Code 提供三个变量用以引用路径

- ``