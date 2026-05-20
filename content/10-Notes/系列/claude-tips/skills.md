---
category:
claude_version: 2.1.133
created: 2026-05-20 00:47:35
modified: 2026-05-21 00:49:12
publish: true
tags: [claude]
title: skills
---

> [!info]  
> 从第一性原理看, Skill 本质不是 "新能力", 而是把一类任务的经验、流程、约束、检查标准 封装成可复用的标准化流程.
>
> 它解决的问题不是 "AI 会不会", 而是:  
> AI 在面对某类任务时, 能不能稳定地按正确流程做, 而不是每次临场发挥

## 介绍

Skills 是可以复用、可自动触发的能力包.  

- 可复用
- 自动触发
- 渐进式披露
- 可以把脚本、模板、说明放在一起
- 适合标准化流程

## 基本目录结构

```
my-skill/
└── SKILL.md
```

## SKILL.md 格式

```
---
name: my-skill
description: 这个 skill 的用途，以及什么时候触发
---

# Your Skill Name

## Instructions

## Examples
```

skill 通过顶部的 YAML frontmatter 和 随后的 markdown 内容进行配置

### Frontmatter

| 字段                       | 必需  | 描述                                                                                      |
| ------------------------ | --- | --------------------------------------------------------------------------------------- |
| name                     | ❌   | skill的显示名称. 省略则使用目录名称, 仅小写字母、数字、连字符(最多64个字符)                                            |
| description              | 推荐  | skill的功能以及何时使用它. Claude 使用它来决定何时应用该skill. 若省略则使用markdown内容第一段                           |
| when_to_use              | ❌   | 关于 claude 何时应该调用该skill的额外上下文, 附加到 description                                           |
| argument-hint            | ❌   | 参数提示                                                                                    |
| argument                 | ❌   | 用于 skill 内容中 $name 替换的命名位置参数                                                            |
| disable-model-invocation | ❌   | 默认false, 可设置为true禁止claude 自动加载此skill. 适用于仅需手动触发的skill                                   |
| user-invocable           | ❌   | 默认true, 设置为false从 / 菜单中隐藏                                                               |
| allowed-tools            | ❌   | claude无需请求权限可以直接使用的工具列表. 接受按空格分割的字符串/YAML列表                                             |
| model                    | ❌   | 此 skill 使用的模型, 默认继承会话                                                                   |
| effort                   | ❌   | 模型的思考强度                                                                                 |
| context                  | ❌   | 设置为 fork 则在分叉的 subagent 上下文运行                                                           |
| agent                    | ❌   | 当设置 context:fork 时要使用的 subagent 类型                                                      |
| hooks                    | ❌   | [限定于此skill生命周期的hooks](https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents) |
| paths                    | ❌   | [glob模式](CLAUDE.md%20介绍.md#特定路径的规则). 设置后, claude 仅在处于与模式匹配的文件时自动加载该 skill               |
| shell                    | ❌   | 此 skill 中 `` !`command` `` 和 ` ```! ` 块的 shell. bash(默认) / powershell                   |

### 变量

| 变量                     | 描述                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `$ARGUMENTS`           | 调用 skill 时传递的所有参数                                                                                                          |
| `$ARGUMENTS[N]`        | 按 0 基索引访问特定参数，如 `$ARGUMENTS[0]` 表示第一个参数。                                                                                   |
| `$N`                   | `$ARGUMENTS[N]` 的简写，如 `$0` 表示第一个参数                                                                                         |
| `$name`                | 在 argument frontmatter 列表中声明的命名参数。名称按顺序映射到位置，因此使用 `arguments: [issue, branch]` 时，占位符 `$issue` 扩展为第一个参数，`$branch` 扩展为第二个参数。 |
| `${CLAUDE_SESSION_ID}` | 当前会话 ID。适用于日志记录                                                                                                            |
| `${CLAUDE_EFFORT}`     | 当前工作量级别：`low`、`medium`、`high`、`xhigh` 或 `max`                                                                              |
| `${CLAUDE_SKILL_DIR}`  | 包含 skill 的 `SKILL.md` 文件的目录。对于插件 skills，这是插件内 skill 的子目录，而不是插件根目录。在 bash 注入命令中使用它来引用与 skill 捆绑的脚本或文件，无论当前工作目录如何。           |

> 索引参数使用 shell 风格的引用, 对于包含空格的参数可以使用引号包装.  
> 例: `/my-skill "hello world" second`  
> `$0` = `hello world`  
> `$1` = `second`

## Skills 的位置

| 位置  | 路径                                                                    | 适用于        |
| --- | --------------------------------------------------------------------- | ---------- |
| 企业  | 请参阅[托管设置](https://code.claude.com/docs/zh-CN/settings#settings-files) | 你的组织中的所有用户 |
| 个人  | `~/.claude/skills/<skill-name>/SKILL.md`                              | 你的所有项目     |
| 项目  | `.claude/skills/<skill-name>/SKILL.md`                                | 仅此项目       |
| 插件  | `<plugin>/skills/<skill-name>/SKILL.md`                               | 启用插件的位置    |

当 skills 重名时, 企业覆盖个人, 个人覆盖项目.

插件skill使用 plugin-name:skill 命名空间, 因此不与其他级别冲突

### 实时变更检测

Claude code 监视 skill 目录的文件变更. 在 `~/.claude/skills/`, `.claude/skills/` 或 `--add-dir` 目录内的 `.claude/skills/` 中添加, 编辑和删除 skill 会在当前会话中生效, 无需重启 claude code.

> 若启动 claude时, skills/ 目录不存在, 则需要重启 claude code, 以便监视目录

### 来自其他目录的 skills

`--add-dir` 添加其他目录, 该目录中的 `.claude/skills/` 会自动加载.

其他 `.claude/` 配置 (如 subagent, command等) 不会自动加载. 具体见: [例外表](https://code.claude.com/docs/en/permissions#additional-directories-grant-file-access-not-configuration)

## 渐进式披露

- 第一阶段: 仅加载元数据
	- claude 会话启动时仅加载 skill 名字 和 description. 用以了解有哪些技能可用
- 第二阶段: 完整说明
	- 只有当 Claude 判断某个 skill 与你的任务匹配时, 才会加载 skill 完整说明. skill 中的参考文件也会按需加载

## 控制谁调用 skill

默认情况下, skill 可通过 /my-skill 直接调用 或 由 claude 自动调用. 可通过 frontmatter 字段限制:
- `disable-model-invocation: true`: **只能手动调用**. 用于有副作用的工作流, 例如 /commit, /deploy 等, 避免 claude 自行决定
- `user-invocable: false`: **只有 claude 可以自行调用**. 用于不可作为命令操作的背景知识. 例如: skill作用仅为了解释系统原理, 手动调用无意义

## 注入动态上下文

`` !`<command>` `` 语法在将 skill 内容发送给 Claude 之前运行 shell 命令. 命令输出替换占位符，因此 Claude 接收实际数据，而不是命令本身

```markdown
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

当此 skill 运行时:
1. 每个 `` !`<command>` `` 立即执行
2. 输出替换 skill 内容中的占位符
3. claude 接收带有实际 PR 数据的提示

多行命令:

```
## Environment
```!
node --version
npm --version
git status --short
```

## 在 subagent 中运行 skill

使用 `context: fork` , skill 将在 subagent 独立的上下文中运行, 它无法访问你的对话历史, 仅能看到 SKILL.md 内容和 subagent 的系统提示

> 示例: 使用 Explore subagent 的 skill

```
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

深度分析 $ARGUMENTS

1.使用 Glob 和 Grep 查找相关文件  
2.阅读并分析代码  
3.结合具体的文件总结调查结果

```

## skill 描述被截断

[claude skills 被自动移除](claude%20skills%20被自动移除.md)
