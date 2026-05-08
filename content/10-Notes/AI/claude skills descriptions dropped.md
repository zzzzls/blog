---
created: 2026-05-09 00:03:55
modified: 2026-05-09 00:29:12
tags: [claude]
title: claude skills descriptions dropped
publish: true
---

## 现象

新版本 Claude Code 对话框右下角打开后提示：

> 5 skill descriptions dropped

输入 `/doctor` 命令后，能看到完整说明：

```text
Skill listing will be truncated
  5 descriptions dropped (full descriptions kept for most-used skills) (1.1%/1% of context):
    superpowers:receiving-code-review, codex:gpt-5-4-prompting, codex:codex-cli-runtime, +2 more
  run /skills to disable some, or raise skillListingBudgetFraction (currently 1%) in settings.json
  Opting in would cost ~2k tokens for skills every session and uses rate limits faster
```

## 含义与影响

这个提示的意思是：**Claude Code 发现你的 skills 太多，所有 skill 的 description 加起来超过了默认上下文预算，所以它把一部分"不常用 skill"的描述丢掉了**。

影响：

- skill 还在
- `/skills` 仍能看到
- 仍能通过显式指定 skill 名字来调用
- 但 Claude 自动判断"什么时候该用这个 skill"的能力会下降
- 被 drop description 的 skill 可能更难被自动触发
- 常用 skill 会优先保留完整描述

## 提高上限

编辑 `~/.claude/settings.json`：

```jsonc
{
  "skillListingBudgetFraction": 0.02,
  "skillListingMaxDescChars": 2048
}
```

- `skillListingBudgetFraction`：将全部 skills 元数据限制在上下文窗口的该比例内，超出范围的技能将完全失去其描述。`0.02` => 2%
- `skillListingMaxDescChars`：每项技能描述的字符限制，超过此长度的描述将被截断

## 参考

- https://claudefa.st/blog/guide/mechanics/skill-listing-budget
