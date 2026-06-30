---
created: 2026-06-30 10:28:48
modified: 2026-06-30 23:48:13
tags:
  - pyodbc
  - sqlserver
  - openssl
  - python
title: pyodbc 连接旧版本 SQL Server 2008 SSL 问题
publish: true
---

用 pyodbc + ODBC Driver 18 for SQL Server 连接 SQL Server 2008 时，握手阶段直接报错：

```
[Microsoft][ODBC Driver 18 for SQL Server]SSL Provider: [error:0A00014D:SSL routines::legacy sigalg disallowed or unsupported]
```

## 原因

ODBC Driver 18 默认开启 TLS 加密，底层走系统 OpenSSL。新版 OpenSSL（3.x）把旧签名算法和低版本 TLS 标记为 legacy 并默认禁用，而 SQL Server 2008 的 TLS 实现还停在这些旧算法上 —— 两边对不上，握手被 OpenSSL 拒掉。

> 问题不在 pyodbc，也不在 driver，而在系统 OpenSSL 的安全级别（SECLEVEL）。

## 方案：只给单个进程降一档安全级别

Linux / WSL / Docker 下，写一个临时 OpenSSL 配置，放宽 SSL 限制：

```bash
cat > /tmp/openssl_legacy_sql2008.cnf <<'EOF'
openssl_conf = openssl_init

[openssl_init]
ssl_conf = ssl_sect

[ssl_sect]
system_default = system_default_sect

[system_default_sect]
MinProtocol = TLSv1
CipherString = DEFAULT:@SECLEVEL=0
Options = UnsafeLegacyRenegotiation
EOF
```

三个关键项：

- `MinProtocol = TLSv1` —— 允许 TLS 1.0（SQL Server 2008 上不去 1.2）
- `CipherString = DEFAULT:@SECLEVEL=0` —— 安全级别降到 0，放行旧签名算法
- `Options = UnsafeLegacyRenegotiation` —— 兼容旧式 TLS 重协商

通过 `OPENSSL_CONF` 环境变量挂给 Python 进程，数据库连接串保持不变：

```bash
OPENSSL_CONF=/tmp/openssl_legacy_sql2008.cnf python xxx.py
```

## 踩坑

- **不要改全局 `/etc/ssl/openssl.cnf`** —— 那会把整台机器的所有程序都拉到低安全级别。用 `OPENSSL_CONF` 只作用于当前进程，影响面可控。
- `@SECLEVEL=0` 等于主动关掉一层安全防线，是临时绕过、不是修复。长期方案：升级 SQL Server，或在前面架一层支持现代 TLS 的代理。
