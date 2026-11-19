# 架构

## 原则：单一事实来源（Single Source of Truth）

```
data/entries/<分类>/<slug>.yaml   ← 每条知识一个文件（人写、人审）
data/sources/sources.yaml         ← 来源注册表（每条来源只登记一次）
data/taxonomy/                    ← 分类、搜索同义词、查重白名单
schema/                           ← JSON Schema（结构约束）
        │
        ▼  src/load.ts → src/validate.ts（结构 + 业务规则）
        ▼  src/build.ts（计算性价比、解析来源、排序）
generated/guide.json              ← 所有输出共用的中间数据（自动生成，勿手改）
        │
        ├─► GUIDE.md               （src/render-markdown.ts）
        ├─► website/               （规划：v0.4）
        ├─► PDF / EPUB / offline   （规划：v0.5）
        └─► skill/                 （规划：v0.6，读取 guide.json 检索）
```

任何输出都**不得**直接读 YAML、也不得自己保存一份内容；性价比只在 `src/scoring.ts` 计算一次。

## 目录

| 路径 | 内容 |
|---|---|
| `data/entries/` | 条目，按分类分文件夹；文件名 = `slug` |
| `data/sources/` | 来源注册表 + 核验记录 |
| `data/taxonomy/categories.yaml` | 26 个一级分类，含 `high_risk` 与复核周期 |
| `data/taxonomy/synonyms.yaml` | 口语说法 → 规范标签（搜索与查重共用） |
| `data/taxonomy/dedupe-allow.yaml` | 维护者确认“相似但不重复”的条目对 |
| `schema/` | `entry.schema.json`、`source.schema.json` |
| `src/` | 加载、校验、评分、查重、过期检测、构建、Markdown 渲染 |
| `scripts/` | 命令行入口（`npm run …`） |
| `tests/` | Vitest 单元测试 |
| `docs/` | 方法论、政策、核验记录 |
| `generated/` | 构建产物（提交到仓库，CI 检查是否最新） |

## 命令

| 命令 | 作用 |
|---|---|
| `npm run validate` | Schema + 业务规则（证据、来源、高风险、剂量禁写…） |
| `npm run dedupe` | 重复检测 |
| `npm run stale` | 列出需要复核的条目（只报告，不修改） |
| `npm run verify:sources` | Crossref 核对 DOI、标题、年份、第一作者 |
| `npm run check:links` | 检查非 DOI 来源链接 |
| `npm run build:guide` | 生成 `GUIDE.md` 与 `generated/guide.json` |
| `npm test` / `npm run typecheck` | 单元测试 / TypeScript |
| `npm run check` | 本地一键运行 CI 的离线部分 |

## 国际化（i18n）预留

- 分类名已是 `{ zh, en }` 结构。
- 条目的**非文本字段**（分数、证据等级、来源、适用对象）与语言无关，只存一份。
- 未来英文版计划使用覆盖文件 `data/i18n/en/<id>.yaml`，只包含 `title / summary / recommendation / why_it_matters / how_to_do_it / …` 等文本字段；构建时与主条目合并。缺失翻译时回退中文并标注。**不复制整个数据库。**

## 为什么这样选

- **YAML + JSON Schema**：人类可读、可 diff、可在 PR 里逐行审；Schema 可被任何语言复用。
- **Node + TypeScript**：网站（计划用 Astro 或 Next.js 静态导出）可直接复用 `src/`，避免两套实现。
- **不用数据库、不要后端**：内容是静态的；GitHub Pages / Cloudflare Pages 即可托管。
- **查重不依赖外部服务**：同义词归一 + 字符二元组 TF-IDF，离线、可复现。局限见 [content-workflow.md](content-workflow.md)。
