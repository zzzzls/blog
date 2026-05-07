---
created: 2026-04-28 00:51:04
modified: 2026-05-08 01:34:21
publish: true
tags: ["工具", "wsl"]
title: wsl迁移系统位置
---

WSL 默认装在 C 盘的用户目录下, ext4.vhdx 是稀疏文件, 用着用着就十几个 G, 系统盘很容易吃紧. 把它挪到数据盘还有个附带的好处: 以后重装 Windows 不用再重做一次开发环境, 备份也只需要拷一个 vhdx.

整体思路就一句话: **导出 → 导入到新位置 → 注销旧的**. 下面是完整流程.

## 查看当前安装位置和大小

迁之前先盘点一下: 哪些发行版装在哪、各自占了多少. 微软自己没给好用的命令, 注册表里读出来最准.

下面这段 PowerShell 会扫 `HKCU:\...\Lxss` 下的全部发行版, 列出 `BasePath` (安装目录)、`ext4.vhdx` 路径和占用大小:

```powershell
$lxss = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss"

$rows = foreach ($key in Get-ChildItem -LiteralPath $lxss) {
    $info = Get-ItemProperty $key.PSPath

    $name = [string]$info.DistributionName
    $version = $info.Version
    $rawBasePath = [string]$info.BasePath

    if ([string]::IsNullOrWhiteSpace($rawBasePath)) {
        [PSCustomObject]@{
            Name     = $name
            Version  = $version
            BasePath = "<空>"
            VHDX     = "<未找到 ext4.vhdx>"
            SizeGB   = "-"
        }
        continue
    }

    # 展开环境变量
    $basePath = [Environment]::ExpandEnvironmentVariables($rawBasePath)

    # 去掉 \\?\ 长路径前缀, 避免 PowerShell 5.x 的 Join-Path / Test-Path 异常
    $normalBasePath = $basePath -replace '^\\\\\?\\', ''

    $vhdxFiles = @()

    # 优先检查标准位置
    $directVhdx = "$normalBasePath\ext4.vhdx"

    if (Test-Path -LiteralPath $directVhdx) {
        $vhdxFiles += Get-Item -LiteralPath $directVhdx
    }

    # 如果标准位置没有, 就在该发行版目录下找 vhdx
    if ($vhdxFiles.Count -eq 0 -and (Test-Path -LiteralPath $normalBasePath)) {
        $vhdxFiles = @(
            Get-ChildItem -LiteralPath $normalBasePath -Recurse -File -Filter "*.vhdx" -ErrorAction SilentlyContinue
        )
    }

    if ($vhdxFiles.Count -eq 0) {
        [PSCustomObject]@{
            Name     = $name
            Version  = $version
            BasePath = $basePath
            VHDX     = "<未找到 ext4.vhdx>"
            SizeGB   = "-"
        }
    }
    else {
        foreach ($vhdx in $vhdxFiles) {
            [PSCustomObject]@{
                Name     = $name
                Version  = $version
                BasePath = $basePath
                VHDX     = $vhdx.FullName
                SizeGB   = "{0:N2}" -f ($vhdx.Length / 1GB)
            }
        }
    }
}

$rows | Format-Table -AutoSize
```

只想快速看一眼有哪些发行版的话, `wsl -l -v` 就够了(但看不到磁盘占用):

```bash
wsl -l -v
```

## 迁移步骤

下面假设要迁的旧发行版叫 `Ubuntu` (从微软商店装的默认就是这个名字), 想把新位置放在 `D:\WSL\Ubuntu-22.04`, 顺便把名字也改成 `Ubuntu-22.04`.

### 开始前: 备份易丢配置

`wsl --export` / `--import` 只搬运根文件系统数据, 不会保留发行版**外部**的语义(如 `/etc/wsl.conf` 的默认用户配置), 也不能完全保证**内部**配置在新发行版里依旧可读(uid/属主漂移、systemd 不一定立即接管 cron 等). 进新发行版前先把这些散落配置一并归档到 Windows 侧, 后面缺什么补什么:

```bash
# 在旧发行版里跑, 把所有易丢配置归到 /mnt/d/backup/wsl-migration/
mkdir -p /mnt/d/backup/wsl-migration

# 1) WSL 配置 (import 不会保留)
cp /etc/wsl.conf /mnt/d/backup/wsl-migration/                2>/dev/null

# 2) 改过的系统级文件
cp /etc/fstab /etc/hosts /etc/resolv.conf /mnt/d/backup/wsl-migration/ 2>/dev/null
cp -r /etc/sudoers.d /mnt/d/backup/wsl-migration/            2>/dev/null
cp -r /etc/profile.d /mnt/d/backup/wsl-migration/            2>/dev/null

# 3) 当前用户级
crontab -l > /mnt/d/backup/wsl-migration/crontab.txt         2>/dev/null
cp -r ~/.ssh /mnt/d/backup/wsl-migration/ssh                 2>/dev/null

# 4) 自定义 systemd unit (用了 systemd 才需要)
cp -r /etc/systemd/system /mnt/d/backup/wsl-migration/systemd 2>/dev/null
```

为什么这些值得单独备(即使 vhdx 理论上能搬走):

- `~/.ssh`、crontab 这类东西在 home / `/var/spool/cron` 里, vhdx 当然能带, 但 import 后默认登入是 root, uid/属主漂移可能让原账户读不到, 单独备一份心里有底.
- `/etc/sudoers.d/`、`/etc/profile.d/` 经常被忽略, 漏了会突然没 sudo / PATH 不对.
- Docker engine 数据目录 (`/var/lib/docker`) **不建议**整体备, 体积大、文件特性复杂(socket、稀疏文件), 改用 `docker save` / `docker volume export` 选择性导出更稳—— 这一项只在用 docker engine 而非 Docker Desktop 时才相关.

### 1. 关闭 WSL

```bash
wsl --shutdown
```

> 必须先关. 跑着的时候 vhdx 是被锁住的, export 会报错.

### 2. 导出旧发行版

```bash
wsl --export Ubuntu D:\backup\Ubuntu.vhdx --vhd
```

`--vhd` 让导出直接以 vhdx 作归档, 不再走 tar 中转. 优点是**速度快**、**保留 ext4 元数据**(权限位、特殊文件、硬链接), 中转占用也更可预测. 找个空间够的盘——导出文件体积约等于源 vhdx 的实际数据量.

### 3. 导入到新位置

```bash
wsl --import Ubuntu-22.04 D:\WSL\Ubuntu-22.04 D:\backup\Ubuntu.vhdx --vhd --version 2
```

三个参数依次是: 新发行版名、新的安装目录(新的 ext4.vhdx 会落在这里)、刚才导出的 vhdx 文件. `--version 2` 强制用 WSL2.

### 4. 设为默认发行版

```bash
wsl --set-default Ubuntu-22.04
```

之后直接敲 `wsl` 就进新的这个.

## 进入新发行版后: 修复默认用户

新导入的发行版默认登入的是 root. 乍一看以为系统错乱了, 其实是正常的—— `wsl --import` 不会保留原来的 `/etc/wsl.conf` 默认用户配置, 得参考刚才备份的 wsl.conf 重新写回. 最少要补回的是 `[user]`:

```bash
vim /etc/wsl.conf
```

```ini
[user]
default=你的用户名
```

然后退出重启这一个发行版:

```bash
wsl --terminate Ubuntu-22.04
```

再 `wsl` 进去, 默认用户就回来了.

## 收尾: 注销旧发行版

> ⚠️ 不可逆操作. **先用新发行版跑一段时间**再执行下面这条, 否则数据找不回来.

建议至少跑 1-3 天, 期间把下面这些过一遍:

- [ ] 关键工具能跑: `node -v` / `python --version` / `git --version` 等(按你的栈来)
- [ ] 家目录文件齐: `du -sh ~` 和迁移前对比, 或 `ls -la ~/<关键项目目录>/`
- [ ] 容器 / 数据库能起: `docker ps`、`systemctl status postgresql / mysql / redis`、连进去 select 一下
- [ ] 网络和 DNS 正常: `curl -I https://example.com`、`nslookup github.com`
- [ ] 自启稳定: `wsl --shutdown` 后再 `wsl` 进去, systemd 服务、cron、自定义 profile 还在

```bash
wsl --unregister Ubuntu
```

旧的 ext4.vhdx 会一起释放掉, C 盘瞬间回血. 备份的 `.vhdx`(或 `.tar`) 保险起见多留几天再删.

## 最后: 别忘了 `~/.wslconfig`

`/etc/wsl.conf` 是发行版**内部**的配置, 在 ext4.vhdx 里; 而 Windows 用户目录下的 `C:\Users\<你>\.wslconfig` 是 WSL **全局**配置, 控制所有发行版共享的资源(memory / processors / swap / kernelCommandLine 等). 这个文件不在任何发行版里, export/import 也不会动它—— 同机器迁移可以完全忽略.

但如果你这次顺便**换机器**, 记得把它一起拷过去, 否则新机器上 WSL 会用默认资源(memory 50% 总内存 / swap 25%), 内存大的服务可能跑不动.
