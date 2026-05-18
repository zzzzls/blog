---
category: meta
claude_version: 2.1.133
created: 2026-05-14 08:58:38
modified: 2026-05-19 00:33:59
publish: true
tags: [工具, claude, meta]
title: CLAUDE.md 介绍
---

每次 Claude Code 会话打开时都是一个全新的上下文窗口。有两种机制可以在会话之间传递知识:

- CLAUDE.MD: 为 Claude 提供持久上下文的指令
- Auto Memory: Claude 会根据你的更正和偏好自动记录笔记

## 初始化 CLAUDE.md

添加适用于在本项目上使用的指令:

- 构建和测试命令
- 编码标准
- 架构决策
- 命名约定
- 常见工作流

> [!info]  
> 运行 /init 自动生成 CLAUDE.md,该命令会分析你的代码库并创建一个包含构建命令、测试指令和它发现的项目约定的文件。
>
> 如果 CLAUDE.md 已经存在,/init 会进行改进而不是覆盖。
>
> 设置 `CLAUDE_CODE_NEW_INIT=1` 可启动交互式多阶段流程,/init 询问要设置哪些工作:CLAUDE.md、skills、hooks,然后使用 subagent 探索你的代码库,通过后续问题填补空白,并在生成之前创建一个 plan 供你审核。

## CLAUDE.md 标准规范

- **大小**: 每个 CLAUDE.md 文件目标在 200 行以下
- **结构**: 使用 markdown 来组织相关指令
- **具体性**: 编写具体到足以验证的指令。例:
	- 正确格式化代码 ❌ / 使用 2 空格缩进 ✅
	- 测试更改 ❌ / 在提交前运行 npm test ✅
	- 保持文件有组织 ❌ / API 处理程序位于 `src/api/handlers/` ✅
- **一致性**: 如果两条规则相互矛盾,Claude 可能会选择任意一条。定期审查你的 CLAUDE.md 文件、子目录中的 CLAUDE.md,以删除过时 / 冲突的指令。

## 导入其他文件到 CLAUDE.md

CLAUDE.md 中可以使用 `@path/to/import` 语法导入其他文件。导入的文件在启动时展开并加载到上下文。

- 允许使用相对路径和绝对路径
- 相对路径相对于当前 CLAUDE.md,而不是工作目录
- 导入的文件可以递归导入其他文件,最大深度为五跳

```markdown
有关项目概述,请参阅 @README,有关此项目的可用 npm 命令,请参阅 @package.json。

# 其他指令
- git 工作流 @docs/git-instructions.md
```

## 不同位置的 CLAUDE.md

| Scope | Location                                                                                                                                                                | Purpose                        | Use case examples | Shared with |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------- | ----------- |
| 组织配置  | • macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`  <br>• Linux and WSL: `/etc/claude-code/CLAUDE.md`  <br>• Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | 由 IT/DevOps 管理的全组织范围指令         | 公司编码标准、安全策略、合规要求  | 组织中的所有用户    |
| 用户配置  | `~/.claude/CLAUDE.md`                                                                                                                                                   | 所有项目的个人偏好                      | 代码样式偏好设置、个人工具快捷键  | 只有你(所有项目)   |
| 项目配置  | `./CLAUDE.md` or `./.claude/CLAUDE.md`                                                                                                                                  | 项目团队共享指南                       | 项目架构、编码标准、通用工作流程  | 团队成员通过源代码控制 |
| 本地配置  | `./CLAUDE.local.md`                                                                                                                                                     | 个人项目特定偏好设置;请添加到 `.gitignore` 中 | 您的沙箱 URL,首选测试数据   | 只有你(当前项目)   |

## 何时添加到 CLAUDE.md

- Claude 第二次犯了同样的错误
- 代码审查发现了一些 Claude 本应知道的代码库问题
- 你在聊天中输出了与上次会话中相同的更正或澄清内容
- 新队友也需要同样的上下文才能高效工作

如果某个条目**涉及多步骤流程**或**仅与代码库某个部分相关**,则应将其移至 skills 或 rules 中。

## CLAUDE.md 的加载顺序

Claude Code 读取 CLAUDE.md 文件的方式是从当前工作目录向上遍历目录树,并检查沿途各个目录是否存在 `CLAUDE.md` / `CLAUDE.local.md`。

所有发现的文件都会拼接起来,形成上下文(并非相互覆盖)。拼接的顺序是从文件系统根目录到你的工作目录。

对于 foo/bar 目录,拼接的顺序为:

```text
~/.claude/CLAUDE.md

foo/CLAUDE.md
foo/CLAUDE.local.md

foo/bar/CLAUDE.md
foo/bar/CLAUDE.local.md
```

> [!info]  
> 每个目录中,CLAUDE.local.md 会附加在 CLAUDE.md 之后。
>
> 可以通过 `/memory` 命令查看当前会话中加载的所有 CLAUDE.md。

### 排除指定目录中的 CLAUDE.md

如果你在一个大型单体仓库中,其中全部的 CLAUDE.md 都会被加载,可以通过 [claudeMdExcludes](https://code.claude.com/docs/en/memory#exclude-specific-claude-md-files) 跳过他们。

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

- 组织配置的 CLAUDE.md 无法排除
- 你可以在任何层级的 settings.json 中配置,各层中的配置最终会合并

### CLAUDE.md 中的注释

可以通过 html 块级注释标签 `<!-- 这是注释 -->` 在 CLAUDE.md 中添加注释,这些内容会在注入 Claude 上下文之前移除。

```markdown
这是正常的 claude.md 内容

<!--
这是注释
这是注释
这是注释
-->

这是正常的 claude.md 内容
```

### 从其他目录加载

`--add-dir` 参数允许 Claude 访问主工作目录之外的其他目录。默认情况下,这些目录中的 CLAUDE.md 文件不会加载。

要从其他目录加载 CLAUDE.md 文件,需设置 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` 环境变量。

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

这会从附加目录加载:

- CLAUDE.md
- .claude/CLAUDE.md
- .claude/rules/*.md
- CLAUDE.local.md

## .claude/rules 组织规则

对于较大的项目,可以使用 `.claude/rules/` 目录将不同类型指令拆分到多个文件中,更易于维护。还可以限定生效路径,仅在匹配到对应的文件时加载到上下文,减少噪音并节省上下文空间。

### 设定规则

在项目的 `.claude/rules/` 目录放置 markdown 文件。每个文件应对应一个主题,并设置描述性的文件名,如 `testing.md`、`api-design.md`。

所有的 .md 文件都会被递归发现,因此你可以将规则组织到子目录中,如 `frontend/`、`backend/`。

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # 主项目指令
│   └── rules/
│       ├── code-style.md   # 代码样式指南
│       ├── testing.md      # 测试约定
│       └── security.md     # 安全要求
```

> 没有 paths frontmatter 的规则在启动时与 `.claude/CLAUDE.md` 相同的优先级加载。

### 特定路径的规则

规则可以使用带有 paths 字段的 YAML frontmatter 限定到特定文件。这些条件规则**仅在 Claude 处理与模式匹配的文件时触发**,而不是在每次工具使用时。

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 开发规则

- 所有 API 端点必须包括输入验证
- 使用标准错误响应格式
- 包括 OpenAPI 文档注释
```

> paths 字段中可以使用 glob 模式按扩展名、目录或任何组合匹配文件。

| 模式                     | 匹配                     |
| ---------------------- | ---------------------- |
| `**/*.ts`              | 任何目录中的所有 TypeScript 文件 |
| `src/**/*`             | `src/` 目录下的所有文件        |
| `*.md`                 | 项目根目录中的 Markdown 文件    |
| `src/components/*.tsx` | 特定目录中的 React 组件        |
| `**/*.{ts,tsx}`        | 匹配多个扩展名                |

### 用户级规则

`~/.claude/rules/` 中的规则适用于每个项目中,可以在其中定义公共规则。

```text
~/.claude/rules/
├── preferences.md    # 你的个人编码偏好
└── workflows.md      # 你的首选工作流
```

## 参考

- https://code.claude.com/docs/en/memory
