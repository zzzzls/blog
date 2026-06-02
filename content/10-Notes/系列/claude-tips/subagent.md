---
category:
claude_version: 2.1.133
created: 2026-06-02 23:20:15
modified: 2026-06-03 02:42:09
publish: true
tags: [claude]
title: subagent
---

subagent 是有一个 主对话 在特定条件下创建出来的独立 AI 单元, 专门处理特定任务.

每个 subagent 有自己的专门的上下文、系统提示、工具访问权限 和 工作流程. 核心在于解决两个问题:

1. **上下文污染**
	- 大量细节/中间思考信息 (*grep 结果、日志、测试输出、无关代码片段*) 塞进主对话, 若后续不会再次引用这些内容, 白白浪费上下文, 且后续决策更容易偏移
2. **并行探索**
	- 可以同时启用多个subagent分析不同任务, 最终将结果汇总到主上下文

> [!info] 为什么放弃单会话?  
> 当你让 claude 同时审查代码、优化性能 和 检查安全性时, 你只能得到的只是泛泛的建议.  
> 同一个上下文中, 每个任务都在争夺注意力, 导致对所有领域的分析都流于表面  
>
> subagent 通过创建专门的上下文来解决这个问题. 每个代理专注于其任务, 使用不同的工具和方法, 最终将所有任务结果汇总到主代理进行全面分析

# 内置 subagent

|                   | model | tools | 作用                     |
| ----------------- | ----- | ----- | ---------------------- |
| Explore           | Haiku | 只读工具  | 搜索并分析代码库               |
| Plan              | 继承主对话 | 只读工具  | plan mode 期间使用         |
| General-purpose   | 继承主对话 | 所有工具  | 复杂研究、多步骤操作、代码修改        |
| claude-code-guide | Haiku |       | 回答关于 Claude Code 功能的问题 |

# 编写 subagent

> Subagents 在会话启动时加载  
> 如果你编辑了 subagent 文件, 需要重启会话.  
> 通过 /agents 创建的 subagents 无需重启立即生效

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

frontmatter 定义了 subagent 的元数据和配置, 正文则成为 subagent 的 system prompt.

## subagent 位置

| Location              | Scope         | Priority | 如何创建                    |
| --------------------- | ------------- | -------- | ----------------------- |
| `--agents` CLI 标志     | 当前会话          | 2        | 启动 Claude Code 时传递 JSON |
| `.claude/agents/`     | 当前项目          | 3        |                         |
| `~/.claude/agents/`   | 所有项目          | 4        |                         |
| Plugin 的 `agents/` 目录 | 启用 plugin 的位置 | 5（最低）    | 与 plugins起安装            |

## subagent 上下文

每个 subagent 都以全新的上下文窗口开始, 它看不到你在主会话中的对话历史, 初始上下文包含:
1. subagent 自己的系统提示词, 定义在 markdown 中
2. claude 在移交工作时编写的委托提示
3. claude.md 和 memory
4. git 状态: 父会话启动时的git快照状态
5. 预加载的技能: 定义在 skill 字段中的完整 skill 内容

## 支持的 frontmatter 字段

| Field             | Required | 默认值                    | Description                                                                                              |
| ----------------- | -------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `name`            | ✔        |                        | 使用小写字母和连字符的唯一标识符, 不必与文件名一致                                                                               |
| `description`     | ✔        |                        | Claude 何时应该委托给此 subagent                                                                                 |
| `tools`           |          | 继承                     | subagent 可以使用的tools列表                                                                                    |
| `disallowedTools` |          |                        | 要拒绝的工具，从继承或指定的列表中删除                                                                                      |
| `model`           |          | 继承                     | `sonnet`、`opus`、`haiku`、完整模型 ID（例如，`claude-opus-4-8`）                                                    |
| `permissionMode`  |          | 继承                     | `default`、`acceptEdits`、`auto`、`dontAsk`、`bypassPermissions` 或 `plan`                                    |
| `maxTurns`        |          |                        | subagent 停止前的最大代理轮数                                                                                      |
| `skills`          |          |                        | 将skill完整内容注入subagent上下文，而不仅仅是描述。未设置的skill仍可以发现和调用                                                        |
| `mcpServers`      |          |                        | 本 subagent 可用的mcp                                                                                        |
| `hooks`           |          |                        | 限定于本 subagent 的 hooks                                                                                    |
| `memory`          |          |                        | `user`、`project` 或 `local`。[启用持久记忆](https://code.claude.com/docs/en/sub-agents#enable-persistent-memory) |
| `background`      |          | false                  | 设置为 `true` 以始终将此 subagent 作为 background task 运行                                                          |
| `effort`          |          | 继承                     | `low`、`medium`、`high`、`xhigh`、`max`                                                                      |
| `isolation`       |          | 默认使用 default branch 分支 | 设置为 `worktree` 以在临时 git worktree中运行 subagent。如果 subagent 不进行任何更改，worktree 会自动清理                          |
| `color`           |          |                        | Subagent 在任务列表和转录中的显示颜色。接受 `red`、`blue`、`green`、`yellow`、`purple`、`orange`、`pink` 或 `cyan`               |
| `initialPrompt`   |          |                        | 当此代理作为主会话代理运行时（通过 `--agent` 或 `agent` 设置），前置于任何用户提供的提示                                                   |

# 使用 subagent

## 自动委托

当 claude 遇到与 subagent 描述相匹配的任务时, 它会委托给该subagent, subagent 独立工作并返回结果

> 要积极触发自动委托, 可以在 description 字段中包含 "use proactively、主动调用" 之类的短语

## 显式调用

- **自然语言**: *让 code-reviewer 查看我最近的更改*
- **@-mention**: *@"code-reviewer (agent)" 检查鉴权模块*
- **将整个会话作为 subagent**: `claude --agent code-reviewer`

## 在前台/后台运行

Subagents 可以在前台（阻塞）或后台（并发）运行：

- **前台**: 阻塞主对话直到完成。权限提示会在出现时传递给你。
- **后台**: 并发运行。它们使用会话中已授予的权限运行，并自动拒绝任何会提示的工具调用, 但 subagent 继续。


Claude 根据任务决定是否在前台或后台运行 subagents。你也可以：
- 要求 Claude "run this in the background"
- 按 **Ctrl+B** 将运行中的任务放在后台
