---
created: 2026-03-27 00:08:28
modified: 2026-04-08 02:44:10
tags: []
title: tmux
publish: true
---

# 介绍

## 会话与进程

命令行的典型使用方式是, 打开一个终端窗口, 在里面输入命令. 用户与计算机的这种临时的交互, 称为一次 " 会话 " (session)

会话一个特点是:
- 窗口与其中启动的进程是连在一起的
- 打开窗口, 会话开始
- 关闭窗口, 会话结束, 会话内部的进程也随之终止


> 典型例子: SSH 登录远程计算机跑一个长任务. 这时, 网络突然断线, SSH 会话终止, 里边的任务也随之结束

## 剥离表象

在 Linux/Unix 系统底层, 当你的 SSH 连接断开时, 系统内核会向该连接下属的所有子进程发送一个 SIGHUP (signal hang up, 挂断信号) 的指令, 强制终止它们. 此时, 网络连接 等于 程序的生命线.

本质上: tmux 是一个拦截并接管输入/输出流的 中间代理服务器
1. 状态持久化 (屏蔽 SIGHUP 信号)
	- tmux 在服务器后台以守护进程的形式运行
	- ssh 连接不在直接对话 shell, 而是对话 tmux
		- 原本: `你 <-> 终端程序 <-> shell`
		- tmux: `你 <-> tmux client <-> tmux server <-> 多个 shell / 程序`
	- 当 ssh 断开时, 死的只是 ssh->tmux 这条线, tmux 守护进程依然活着, 并保管正在运行的任务
2. 降低网络熵与 TCP 开销
	- 你想在服务器上同时看日志, 改代码, 监控 CPU
	- 没有 tmux, 你需要开启 3 个 SSH 连接, 耗费 3 次 TCP 握手和加密认证
	- 通过 tmux, 只需要 1 个 ssh, 它在服务端帮你把数据流拆分成三个画面, 极大降低网络开销

## Tmux 架构

tmux 采用 CS (客户端 - 服务器) 模型
- client: 当前看到的 tmux 界面
- server: 后台总管, 维护所有 session, window, pane. client 断了, server 可以继续存在

3 个对象:
- session: 工作区 (一个项目上下文 / 一次任务集合)
- window: 标签页
- pane: 标签页内的分屏

> 一个 session 装多个 window; 一个 window 内再切成多个 pane

## Tmux 的作用

Tmux 就是会话与窗口的 **解绑** 工具
1. 它允许在单个窗口中, 同时访问多个会话
2. 它可以让新窗口 接入已存在的会话
3. 它允许每个会话有多个连接窗口, 可以实现多人实时共享会话
4. 它还支持窗口任意的排列 (垂直和水平拆分)

# 使用

## quickstart: 标准工作流

假设你现在连接到一台远程云服务器, 准备开发一个名为 "helloworld" 的 Web 项目. 你需要:
- 运行服务断
- 监控日志
- 查看系统 CPU 资源
- 修改代码

### 第一层: Session(会话) --- 划分项目边界

- 场景: 你刚登入服务器
- 动作: 启动并命名一个 Session
	- 输入命令: `tmux new -s helloworld
- 底层逻辑: 你告诉后台 tmux 守护进程: " 帮我开辟一块独立内存, 接下来我要干的所有事, 都打包归属在这个名字下 "

### 第二层: Window(窗口) --- 划分任务上下文

- 场景: 现在你进入 tmux 的界面. 你不想把所有的东西挤在一个屏幕上. 你希望 " 运行服务 " 在一个页面, " 修改代码 " 在另一个页面
- 动作: 创建类似浏览器标签页的 Window
	- 重命名当前窗口: **`ctrl+b,`**, 把它命名为 server, 这个窗口中启动 web 服务
	- 新建一个窗口: **`ctrl+b c`**, 画面一闪, 你来到一个全新的终端面板
	- 重命名当前窗口: **`ctrl+b,`**, 把它命名为 dev, 这个窗口中使用 vim 写代码
	- 在窗口间切换: **`ctrl+b <number>`**, 在两个工作台之间瞬间切换
- 底层逻辑: Window 解决了单个显示器屏幕面积有限, 需要并且处理不同类别任务的痛点

### 第三层: Pane(窗格) --- 并行视觉监控

- 场景: 你切回了 server 窗口, web 服务正在上面跑着, 当你突然想实时盯着错误日志, 还想看看 cpu 占用 (top), 你希望同时看到它们
- 动作: 切割当前屏幕
	- 上下分屏: **`ctrl+b "`**, 屏幕被拦腰截断, 下半部分出现新终端, 你输入查看日志的命令
	- 左右分屏: **`ctrl+b %`**, 下半屏又被劈成了左右两半, 你在右边输入 top 查看系统资源
	- 在窗格间跳转: **`ctrl+b <方向键>`**, 光标就会在三个窗格之间穿梭
- 底层逻辑: Pane 解决了高内聚任务需要眼观六路的痛点, 不需要切换标签, 一目了然

### 第四层: Detach & Attach --- 时光机与任意门

- 场景: 晚上 6 点, 公司网络开始波动, 以往你肯定心惊肉跳, 但现在你有 tmux
- 动作 1: 主动剥离 (Detach)
	- 按 **`ctrl+b d`**
	- 结果: 画面瞬间退回到你刚登入服务器时最原始的黑框. 就像你关上了微波炉的门走开了, 但微波炉里的盘子 (helloworld 项目) 还在转. 你放心地合上电脑回家
- 动作 2: 重新连接 (Attach)
	- 晚上, 你在家里电脑连上服务器紧急处理一个 bug
	- 查看后台有几个项目在跑: 输入命令 **`tmux ls`**. 系统返回: `helloworld: 2 windows (created Fri Mar 27 01:04:34 2026)`
	- 回到项目: 输入命令 **`tmux attach -t helloworld`**
	- 结果: 你创建的 2 个 window, 切好的 3 个窗格, 跑了一半的日志, 没关掉的 vim, 连同光标停留的准确位置, 百分之百完美重现在你的眼前

## 快捷键

tmux 默认前缀快捷键时 ctrl-b, 很多操作都长这样:
- `c-b c`: 先按 ctrl-b, 松开, 再按 c
- `c-b d`: 先按 ctrl-b, 松开, 再按 d  
默认按键中, c 是新建 window, d 是 dttach,? 是查看全部快捷键

### Session 操作

> 第一个启动的 tmux 窗口编号是 0, 第二个是 1, 依次类推

| 操作    | 命令                                    | 快捷键   |
| ----- | ------------------------------------- | ----- |
| 查看会话  | `tmux ls`                             | c-b s |
| 新建会话  | `tmux new -s <session-name>`          |       |
| 杀死会话  | `tmux kill-session -t <session-name>` |       |
| 切换会话  | `tmux switch -t <session-name>`       |       |
| 重命名会话 | `tmux rename-session -t 0 <new-name>` | c-b $ |
|       |                                       |       |
| 接入会话  | `tmux attach -t <session-name>`       |       |
| 分离会话  | `tmux detach`                         | c-b d |

### Window 操作

| 操作       | 命令                                    | 快捷键            |
| -------- | ------------------------------------- | -------------- |
| 查看窗口     | `tmux list-windows`                   | c-b w          |
| 新建窗口     | `tmux new-window -n <window-name>`    | c-b c          |
| 切换窗口     | `tmux select-window -t <window-name>` |                |
| 重命名窗口    | `tmux rename-window <new-name>`       | c-b,          |
| 杀死窗口     | `tmux kill-window [-t <window-name>]` | c-b &          |
|          |                                       |                |
| 切换到下一个窗口 |                                       | c-b n          |
| 切换到上一个窗口 |                                       | c-b p          |
| 按编号切换    |                                       | `c-b <number>` |

### Pane 操作

| 操作              | 命令                     | 快捷键         |
| --------------- | ---------------------- | ----------- |
| 上下划分            | `tmux split-window`    | c-b %       |
| 左右划分            | `tmux split-window -h` | c-b "       |
| 关闭窗格            |                        | c-b x       |
|                 |                        |             |
| 切换窗格 [方向键]      |                        | `c-b <方向键>` |
| 切换到上一个窗格        |                        | c-b;        |
| 切换到下一个窗格        |                        | c-b o       |
| 光标移动到上方窗格       | `tmux select-pane -U`  |             |
| 光标移动到下方窗格       | `tmux select-pane -D`  |             |
| 光标移动到左方窗格       | `tmux select-pane -L`  |             |
| 光标移动到右方窗格       | `tmux select-pane -R`  |             |
|                 |                        |             |
| 当前窗格上移          | `tmux swap-pane -U`    |             |
| 当前窗格下移          | `tmux swap-pane -U`    |             |
| 当前窗格与上一个窗格交换位置  |                        | c-b {       |
| 当前窗格与下一个窗格交换位置  |                        | c-b }       |
| 所有窗格向前移动一个位置    |                        | c-b c-0     |
| 所有窗格向后移动一个位置    |                        | c-b a-o     |
|                 |                        |             |
| 当前窗格全屏显示，再按一次恢复 |                        | c-b z       |
| 调整窗格大小          |                        | `c-b c-方向键` |
| 显示窗格编号          |                        | c-b q       |
| 拆分当前窗格为一个独立窗口   |                        | c-b!        |

# Tmux API

## 1.终端操作

## 2.窗口布局

## 3.Hooks 钩子

# Tmux 配置

- 保存并更新配置: `tmux source-file ~/.tmux.conf`

```bash
# --- 基础 ---
set -g default-terminal "screen-256color"
set -g mouse on
set -g history-limit 100000
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# --- 分屏更顺手 ---
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# --- 窗格切换 ---
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# --- 重载配置 ---
bind r source-file ~/.tmux.conf \; display-message "tmux.conf reloaded"

# --- 状态栏 ---
set -g status-interval 5
set -g status-left-length 30
set -g status-right-length 80
set -g status-left "#S "
set -g status-right "%Y-%m-%d %H:%M"

# --- TPM 插件管理 ---
set -g @plugin 'tmux-plugins/tpm'

# 合理默认值
set -g @plugin 'tmux-plugins/tmux-sensible'

# 手动保存/恢复会话
set -g @plugin 'tmux-plugins/tmux-resurrect'

# 自动保存/自动恢复
set -g @plugin 'tmux-plugins/tmux-continuum'

# continuum 每 15 分钟自动保存一次
set -g @continuum-save-interval '15'

# 打开 tmux 时自动恢复
set -g @continuum-restore 'on'

# 可选：恢复 vim / nvim session
set -g @resurrect-strategy-vim 'session'
set -g @resurrect-strategy-nvim 'session'

run '~/.tmux/plugins/tpm/tpm'
```


- tmux-resurrect save 无反应 问题?
	- 可能目录没有创建权限, 可手动创建: `mkdir -p ~/.tmux/resurrect && touch ~/.tmux/resurrect/test && ls -l ~/.tmux/resurrect`