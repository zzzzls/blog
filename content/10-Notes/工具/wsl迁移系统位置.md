---
created: 2026-04-28 00:51:04
modified: 2026-05-08 00:58:21
tags: ["wsl", "工具"]
title: WSL 迁移系统位置
publish: true
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

> 💡 **开始前: 备份 `/etc/wsl.conf`**
>
> `wsl --export` / `--import` 只搬运根文件系统(tar 包里就是 rootfs), 不携带 wsl.conf 的配置语义—— 新导入的发行版里这个文件会是空的或回到默认状态. 如果原来的 wsl.conf 除了 `[user]` 还有 `[boot] systemd=true`、`[network] generateResolvConf=false`、自定义挂载选项等, 全都得手动写回. 进新发行版前先把它备份出来:
>
> ```bash
> cp /etc/wsl.conf /mnt/d/backup/wsl.conf.bak
> ```
>
> 类似地, 如果你改过 `/etc/fstab`、`/etc/hosts` 之类的系统文件, 一并备份一份会省事很多.

### 1. 关闭 WSL

```bash
wsl --shutdown
```

> 必须先关. 跑着的时候 vhdx 是被锁住的, export 会报错.

### 2. 导出旧发行版到归档文件

```bash
wsl --export Ubuntu D:\backup\Ubuntu.tar
```

`.tar` 文件本质上就是这个发行版的根文件系统快照, 体积和 vhdx 差不多大. 找个空间够的盘.

### 3. 导入到新位置

```bash
wsl --import Ubuntu-22.04 D:\WSL\Ubuntu-22.04 D:\backup\Ubuntu.tar --version 2
```

三个参数依次是: 新发行版名、新的安装目录 (vhdx 会落在这里)、刚才导出的 tar 包. `--version 2` 强制用 WSL2.

### 4. 设为默认发行版

```bash
wsl --set-default Ubuntu-22.04
```

之后直接敲 `wsl` 就进新的这个.

## 进入新发行版后: 修复默认用户

新导入的发行版默认登入的是 root. 乍一看以为系统错乱了, 其实是正常的—— `wsl --import` 不会保留原来的 `/etc/wsl.conf` 默认用户配置, 得参考[开始前备份的 wsl.conf](#迁移步骤) 重新写回. 最少要补回的是 `[user]`:

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

> ⚠️ 不可逆操作. **先用新发行版跑一段时间**, 确认家目录文件、装的软件、数据库都在, 再执行下面这条. 否则数据找不回来.

```bash
wsl --unregister Ubuntu
```

旧的 ext4.vhdx 会一起释放掉, C 盘瞬间回血. 备份的 `.tar` 保险起见多留几天再删.
