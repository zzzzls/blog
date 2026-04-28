---
created: 2026-03-31 00:53:48
modified: 2026-03-31 18:27:19
tags: []
title: ruff
publish: true
---

- [ruff 官方文档](https://docs.astral.org.cn/ruff/)

# 介绍

> 一款由 rust 编写, 极速的 python 代码检查工具(Linter) 和 格式化工具(Formatter)

- `ruff check`: linter
- `ruff format`: formatter

# QuickStart

- 检查代码问题: `ruff check .`
- 自动修复能修复的安全问题: `ruff check . --fix`
	- ruff 把修复分成safe/unsafe, 默认只修复 safe
- 格式化代码: `ruff format .`
- 只检查是否需要格式化, 不真正改文件: `ruff format . --check`
	- 适合放进 CI, 只要发现有文件没按规范格式化, 就返回非零退出码

## 项目配置

ruff 可以写在这几种文件里:
- `pyproject.toml`
- `ruff.toml`
- `.ruff.toml`

它们配置语义是等价的；如果同一目录下都存在，优先级是：

`.ruff.toml` > `ruff.toml` > `pyproject.toml`


```toml
[tool.ruff]
line-length = 88            # 单行字符长度
target-version = "py311"    # 按照py3.11的语法和规则来判断
src = ["src", "tests"]      # 帮助ruff判断哪些import是first-party
exclude = [                 # 排除这些文件夹
  ".git",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".tox",
  ".venv",
  "venv",
  "__pypackages__",
  "build",
  "dist",
  "node_modules",
  "tests"
]
output-format = "grouped"  # 检测结果按文件分组
fix = true                 # 默认自动修复 safe
show-fixes = true          # 打印ruff修了什么

[tool.ruff.lint]           # 配置 lint 检测的规则集合
select = [
  "E",    # 常见代码风格错误
  "F",    # pyflakes, 抓未使用变量、未定义名称等高价值问题
  "I",    # isort, import 排序
  "UP",   # pyupgrade, 升级python写法为现代写法
  "B",    # flake8-bugbear, 容易隐藏 bug 的写法
  "SIM",  # flake8-simplify, 过度啰嗦, 可简化的代码
]
ignore = [
  "E501",   # 行宽交给 formatter 处理
  "B008",   # FastAPI / Typer 等场景常会误伤
]
fixable = ["ALL"]  # 上述列出规则可自动修复
unfixable = []

# 测试代码通常允许更宽松一些
per-file-ignores = { "tests/**/*.py" = ["S101", "PLR2004"], "__init__.py" =["F401"]}

[tool.ruff.format]
quote-style = "double"              # 统一双引号
indent-style = "space"              # 统一空格缩进
skip-magic-trailing-comma = false   # 保持函数参数分开, 每行一个
line-ending = "auto"                # 跨平台更稳定
docstring-code-format = true        # docstring 中python示例也格式化
docstring-code-line-length = "dynamic"  # docstring中代码也遵守行宽限制
```