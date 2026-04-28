---
created: 2025-11-18 11:05:04
modified: 2026-04-10 14:46:45
tags: []
title: git 分支操作
publish: true
---




- 回退到某个版本 `git reset --hard <hash>`

# 合并子分支到主分支上

## 1. 直接 merge

```bash
git switch main  # 切换到主分支
git merge <B>    # merge 子分支
```

## 2.将分支所有内容合并为一条 commit 到主分支

### 1. 使用 squash merge

```bash
# 1. 确保当前分支已提交所有更改
git add .
git commit -m "功能开发完成"

# 2. 切换到主分支
git switch main

# 3. 使用 --squash 选项合并
git merge --squash 你的分支名

# 4. 提交合并结果（所有更改会变成一次提交）
git commit -m "合并功能分支: 简要描述"
```

### 使用 rebase 和 merge

```bash
# 1. 在当前分支压缩所有 commit
git rebase -i main
# 在编辑器中，将除第一个外的所有 commit 前的 pick 改为 s (squash)
# 保存退出后，会提示你输入新的合并提交信息

# 2. 切换到主分支并合并
git switch main
git merge 你的分支名  # 此时是快进合并
```
