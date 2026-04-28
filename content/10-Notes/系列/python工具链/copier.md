---
created: 2026-04-09 00:00:02
modified: 2026-04-10 02:14:58
tags: []
title: copier
publish: true
---

# 什么是 copier

Copier 是一个开源的项目模板生成工具
- 基于 Jinja2 模板引擎
- 模板支持本地路径 和 Git URL
- 项目可以包含任意文件
- 支持动态替换任何文本文件中的值
- 双向同步: 如果模板发生变化, 可以将更新同步到已生成的项目中

## 安装

```bash
# 基本安装
uv tool install copier

# 安装插件
uv tool install copier --with copier-template-extensions
```

## QuickStart

创建一个模板:

```plaintext
📁 my_copier_template                   # your template project
├── 📄 copier.yml                       # your template configuration
├── 📁 {{project_name}}                 # a folder with a templated name
│    └── 📄 {{module_name}}.py.jinja    # a file with a templated name
└─ {{_copier_conf.answers_file}}.jinja  # answers are recorded here
```

`copier.yml` 文件内容:

```yaml
project_name:
    type: str
    default: "{{ _folder_name  }}"
    help: What is your project name?

module_name:
    type: str
    help: What is your Python module name?
```

`{{module_name}}.py.jinja` 文件内容:

```python
print("Hello from {{module_name}}!")
```

`{{_copier_conf.answers_file}}.jinja` 文件内容:
```
# Changes here will be overwritten by Copier
{{ _copier_answers|to_nice_yaml -}}
```


从模板生成项目:
```bash
copier copy path/to/template path/to/destionation
```

## 底层机制

Copier 运转依赖两个基石: **Jinja2（模板渲染） + Git（差异对比与合并）**. 最核心的秘密武器是它在目标项目下生成的 `.copier-answers.yml` 文件。这个文件相当于**项目的 DNA 记录**，它记住了：你用的是哪个版本的模板，以及你当时回答了什么问题（项目名、作者等）

操作逻辑:
1. **定义**: 创建一个包含 `copier.yml`（定义要问用户的问题）和模板文件（包含 `{{ question_answer }}` 变量）的 模板
2. **生成**: 运行 `copier copy <模板URL> <本地目录>`。 Copier 提问 -> 渲染文件 -> 存下 `.copier-answers.yml`
3. **[更新](https://copier.readthedocs.io/en/latest/updating/#how-the-update-works)**: 当你修改了模板, 在本地项目目录运行 `copier update`
	- 先重新生成一个 "旧版本模板对应的干净项目"
	- 用它和 "当前项目" 做 diff, 算出你后来做过哪些改动
	- 再把当前项目按新模板升级
	- 最后再把刚才那份 diff 补回来 (有冲突则抛出)

# 创建模板

模板是一个目录, 生成项目时:
- 普通文件: 原样复制到目标位置
- `.jinja` 结尾: 模板引擎将渲染它们
- 如果一个带后缀的文件与另一个不带后缀的文件相邻, 不带后缀的文件将被忽略

## 模板辅助函数

除了 Jinja 支持的所有功能外, Copier 还支持 [jinja2-ansible-filters](https://gitlab.com/dreamer-labs/libraries/jinja2-ansible-filters/) 提供的所有函数和过滤器

```
{{ project_name | b64encode }}

{{ project_name | md5 }}

{{ project_name | replace('a', 'A') }}
```

## [全局变量](https://copier.readthedocs.io/en/latest/creating/#variables-global)

如下变量在 Jinja 模板中始终可用:

- `_copier_answers`: 问题答案字典
- `_folder_name`: copy命令后跟的项目根目录的名称
- ...

# [配置模板](https://copier.readthedocs.io/en/latest/configuring/)

> 如下为 copier.yml 中支持的配置

### exclude: 排除文件

```yaml
_exclude:
    - copier.yml
    - extensions.py
    - .git
    - .git/**
    - __pycache__
    - __pycache__/**
    - .ruff_cache
    - .venv
    - uv.lock
```

### tasks: 项目生成/更新后要执行的命令

```yaml
_tasks:
  - command: git init
    when: "{{ _copier_operation == 'copy' }}"
  - command: git add .
    when: "{{ _copier_operation == 'copy' }}"
  - command: git commit -m "Initial commit"
    when: "{{ _copier_operation == 'copy' }}"
  - command: uv venv .venv --python {{python_version}}
    when: "{{ _copier_operation == 'copy' }}"
```

# 复制项目

```bash
# 建议使用完整路径, 避免后续 `copier update` 找不到模板路径
copier copy path/to/project/template path/to/destination

# --data 参数, 通过命令行指定问题的答案
```


默认情况下, copier 会复制最新 **Git tag** 对应的版本, 按照 [PEP440](https://peps.python.org/pep-0440/) 进行排序
```
0.9
0.9.1
0.9.2
...
0.9.10
0.9.11
1.0
1.0.1
1.1
2.0
2.0.1
...
```

可以使用 --vcs-ref 参数来指定要使用的分支、tag 或 引用
```bash

# 使用仓库中 main 分支
copier copy --vcs-ref main https://github.com/foo/copier-template.git ./path/to/destination

# 使用本地模板中最新版本（包含未提交的修改）
copier copy --vcs-ref HEAD path/to/project/template path/to/destination
```

# 更新项目

当如下条件满足时, 才可以更新项目:
- 目标文件夹中包含一个有效的 `.copier-answers.yml` 文件
- 模板使用 git 进行版本控制 (with tags)
- 目标文件夹使用 git 进行版本控制

进入目标文件夹, 确保 git status 是干净的, 然后运行:

```bash
copirt update

# 从指定分支、tag 或 引用 更新项目
copirt update --vcs-ref xx

# 重用之前的所有回答
copier update --defaults

# 只更改某个问题
copier update --defaults --data updated_question="my new answer"
```


若更新遇到冲突, 可通过如下参数控制冲突处理方式:
- `--conflict rej`: 为每个有冲突的文件创建一个单独的 .rej 文件
- `--conflict inline`: (default) 在冲突的文件中创建冲突标记, 与 git merge 标记类似

为避免发生损坏, 建议在更新前提交一次版本:
```bash
git status
git add -A
git commit -m "before copier update"

copier update
```