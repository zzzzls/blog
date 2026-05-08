本仓库（公开 GitHub `zzzzls/blog`）是 [Quartz v4.5.2](https://github.com/jackyzha0/quartz) 的**定制 fork**，配合私有 Obsidian vault `zzzzls/obsidianNotes` 通过 GitHub Actions 同步内容、再由 Cloudflare Pages 部署成博客 `blog.bi1vox.site`。

**架构总览**：

```
vault (私有, zzzzls/obsidianNotes)            blog (本仓库, 公开 zzzzls/blog)
└─ 笔记 + 资源 ─────────────────────────────►├─ content/   ← GHA 同步注入（不要手改！）
   GHA (.github/workflows/sync-to-...)        ├─ quartz/    ← Quartz 引擎（含本地补丁）
   produces commits "sync: vault@<sha>"       ├─ quartz.config.ts / quartz.layout.ts
                                              ├─ scripts/postbuild.mjs
                                              ├─ cloudflare/_headers + robots.txt
                                              └─ push → CF Pages 自动构建并部署
```

vault 那一侧的 CLAUDE.md（在 `zzzzls/obsidianNotes`）描述「内容如何流出」；本文件描述「内容流入后如何渲染、定制点在哪、什么不能动」。

## 关键约束（必须遵守）

### 1. `content/` 是 GHA 同步注入的，**不要本地编辑**

`content/` 下所有 `.md` / 资源文件都来自 vault 仓库，由 GHA workflow `sync-to-quartz-site` 在 vault push 后自动写入并提交（commit message `sync: vault@<vault-sha>`）。**本地手动改 content/ 下的笔记，下次同步会被覆盖**。

要改笔记，去 vault 仓库改、push、等 GHA。

如果 `content/` 出现需要修复的问题（比如同步逻辑漏了什么），**改的是 vault 那边的 `99-Meta/scripts/sync-to-quartz-site.mjs`**，不是这边的文件。

### 2. 上游 Quartz 文件已有本地补丁——升级 Quartz 时小心冲突

为了部署优化（字体本地化等），有两个上游文件被改过：

| 文件 | 改了什么 | 原因 |
|------|---------|------|
| `quartz/plugins/emitters/componentResources.ts` | 三处 `fetch` 加 modern Chrome UA | 让 Google Fonts 返回 woff2 + unicode-range 子集（972K→480K） |
| `quartz/util/theme.ts` | `processGoogleFonts` 的 `staticUrl` 改根相对路径 `/static/fonts/...` | 域名变更后不必重建 CSS |

这些改动来自 commit `36c4240`（"perf(deploy): 字体本地化 + 缓存与安全响应头"）。**日后 `git pull jackyzha0/quartz main` 同步上游时可能冲突，要手动合并保留这两处补丁。**

### 3. 自定义组件 `ClaudeMeta`（专为 Claude Tips 系列）

文件：`quartz/components/ClaudeMeta.tsx` + `quartz/components/styles/claudeMeta.scss`，已注册到 `quartz.layout.ts` 的 `defaultContentPageLayout.beforeBody`，紧跟 `ContentMeta` 之后。

行为：从 `fileData.frontmatter` 读 `claude_version` 和 `category`，渲染成一行小字（如 `claude-opus-4-7 · #hooks`）。

**关键守卫（闸）**：组件以 `claude_version` 为必要条件——`if (!version) return null`。意思是：**只有 vault 里 frontmatter 含 `claude_version` 的笔记（即 Claude Tips 系列）才会显示这一行**。其他系列哪怕 frontmatter 也带了 `category`（未来可能复用此字段名）也不会被误显示。

未来若要给其他系列加类似元数据：**写自己的组件**，不要复用 `claude_version` 字段名作为渲染开关。

回滚：`quartz.layout.ts` 删掉 `Component.ClaudeMeta()` 那一行即可（组件文件保留也无副作用）。

### 4. 部署：Cloudflare Pages

CF Pages 项目监听本仓库 main 分支：

- **Build command**: `npm install && npx quartz build`
- **Output directory**: `public`
- **Env**: `NODE_VERSION=22`（Quartz 强制要求 ≥22）

`postbuild.mjs` 会在构建后做这些事（务必在改它前看清楚）：
- 复制 `cloudflare/robots.txt` / `cloudflare/_headers` 到 `public/`
- 自托管 mermaid（从 node_modules 拷到 `public/static/mermaid/`）
- 本地化 LXGW WenKai Screen 字体（GB 子集，~4.3MB / 97 切片）到 `public/static/fonts/lxgw-wenkai-screen/`
- 给 `index.css` / `prescript.js` / `postscript.js` / `contentIndex.json` 加 cache-bust hash

### 5. Cloudflare 响应头（`cloudflare/_headers`）

定义了 cache 策略：
- `static/mermaid/chunks/*` 和 `static/fonts/*`：immutable 一年
- 稳定文件名（`/index.css`、`/postscript.js`）：1 小时 + must-revalidate（靠 cache-bust 解决跨构建变更）
- 图标 / webp：周级
- `index.xml` / `sitemap.xml`：小时级
- 全站附加 X-Frame-Options / Permissions-Policy / HSTS（仅本域）等安全头

改了它要在 CF Pages 部署后用 `curl -I` 验证响应头。

## 目录布局

```
blog/
├─ content/                   # ⛔ vault 同步注入，不要手改
│  ├─ 10-Notes/
│  ├─ 90-Attachments/
│  └─ index.md                # 站点首页（来自 vault 的 10-Notes/index.md）
├─ quartz/                    # Quartz 引擎源码（除约束 2 列出的两个文件外，尽量保持上游一致）
│  ├─ components/
│  │  ├─ ClaudeMeta.tsx       # ⭐ 自定义组件（约束 3）
│  │  ├─ styles/claudeMeta.scss
│  │  └─ ...                  # 其他都是上游 Quartz 内置组件
│  ├─ plugins/emitters/componentResources.ts  # ⚠️ 上游补丁
│  ├─ util/theme.ts                            # ⚠️ 上游补丁
│  └─ .quartz-cache/          # 增量构建缓存（gitignore）
├─ quartz.config.ts           # ⭐ 站点配置（标题、baseUrl、主题、字体、插件链）
├─ quartz.layout.ts           # ⭐ 页面布局（beforeBody / left / right 槽位 + 组件注册）
├─ scripts/
│  └─ postbuild.mjs           # ⭐ 构建后置处理（约束 4）
├─ cloudflare/
│  ├─ _headers                # ⭐ CF Pages 响应头（约束 5）
│  └─ robots.txt
├─ public/                    # 构建产物（gitignore）
└─ package.json               # 沿用上游
```

## 常用命令

```bash
# 安装依赖（必须保留 package-lock.json，npm 解析有 ERESOLVE 风险，没 lockfile 会失败）
npm install

# 本地构建 + 静态服务
npx quartz build && npx serve public -p 8080

# 本地构建并以热重载模式跑（开发体验最佳）
npx quartz build --serve

# TypeScript 检查（不出 emit）
npx tsc --noEmit
```

> ⚠️ **不要用 `python -m http.server`**：Quartz 输出的链接是 clean URL（无 `.html` 后缀），需要服务器有 try_files / fallback 行为。`npx serve`、`npx quartz build --serve`、CF Pages 都内置；`python -m http.server` 全员 404。

## 已知坑

| 现象 | 原因 / 处理 |
|------|------------|
| `npx quartz build` 报 `Failed to emit from plugin ComponentResources: fetch failed` | `fontOrigin: "googleFonts"` 在中国大陆直连无法 fetch Google Fonts。**本地端到端构建在国内网络下需挂 VPN**；CF Pages 端没有此问题。本地只想验证组件类型可以跑 `npx tsc --noEmit` |
| `npm install` 报 `ERESOLVE` peer dep 冲突（esbuild-sass-plugin 等） | 必须保留 `package-lock.json`（已提交），不要删；如果不得已 `--legacy-peer-deps` |
| 升级 Quartz 后 `componentResources.ts` / `theme.ts` 编译失败 | 上游与本地补丁冲突（约束 2）。手动合并：保留本地的 UA 注入和 staticUrl 改路径 |
| CF Pages 部署后字体缺失 / 闪烁 | 看 `cloudflare/_headers` cache 配置 + `postbuild.mjs` 的 `lxgw` 子集复制路径，确认 `public/static/fonts/lxgw-wenkai-screen/` 在产物里 |
| 笔记里的 `<iframe src="/90-Attachments/demos/xxx.htm">` 加载成 octet-stream | vault 那边把 demo 文件命名成 `.html` 了（应该是 `.htm`）。这是 vault 端问题，去 vault 改文件名 |
| `content/` 出现冲突或意外文件 | 由 GHA 同步注入，本地修改无意义。问题在 vault 的同步脚本（`99-Meta/scripts/sync-to-quartz-site.mjs`），去那边改 |

## 给 Claude Code 的提示

- 改本仓库**不会**让 vault 仓库的笔记变样——内容来自 vault，渲染层定制在这里
- 改笔记内容 → 去 vault；改样式 / 布局 / 组件 / 部署 → 在这里
- 加新组件的标准做法（参考 `ClaudeMeta`）：
  1. `quartz/components/<Name>.tsx`（注意 `.css = style` 关联）
  2. `quartz/components/styles/<name>.scss`
  3. `quartz/components/index.ts` 加 `import` 和 `export`
  4. `quartz.layout.ts` 在合适的 slot（`beforeBody` / `left` / `right`）插入 `Component.<Name>()`
  5. `npx tsc --noEmit` 验证
- **不要改 `content/` 下的任何东西**——会被同步覆盖
- **不要随手 `npm update`**——upstream Quartz 的依赖矩阵脆弱，会触发 ERESOLVE。要升级先单独升、跑 `npx quartz build --serve` 实际验证再提交
- 改了 `quartz/plugins/emitters/componentResources.ts` 或 `quartz/util/theme.ts` 之外的 `quartz/` 内文件前，先想一想：是不是该写一个 component 或者改 `quartz.layout.ts` 就够了？尽量不动上游源码（升级时痛苦）
- vault 仓库本地路径：`/mnt/d/backup/obsidianNotes`（用户的 WSL 工作区里）。本仓库本地路径：`/mnt/d/backup/blog`
- 提交 commit 时**避开 `sync: vault@...` 这种命名**——那是 GHA 专用的；人类提交用 `feat:` / `fix:` / `chore:` / `perf:` 等常规前缀（参考 git log）
