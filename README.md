<div align="center">

# 高性价比猫猫指南

**The Cost-Effective Cat Guide**

用合理的钱、时间和精力，让猫更健康、更安全、活得更好，同时少花冤枉钱、少犯错、少被误导。

`v0.7` · 127 条 · 117 个已核验来源 · 0 条兽医审核

</div>

> [!IMPORTANT]
> 本项目整理公开的兽医学资料，用于**教育和信息参考**，**不能代替持证兽医的诊断和治疗**。
> “高性价比”从来不意味着为了省钱拖延就医：**猫出现急症时，医疗紧急程度优先于花费。**
> 目前所有条目都是 AI 研究整理的，**尚未经过兽医审核**。

## 🚨 猫出现这些情况，先别看指南，联系兽医

- **反复蹲猫砂盆却尿不出来**（尤其公猫）→ [当天急诊](GUIDE.md#cg-0007)
- **咬过、舔过百合或萱草，或沾上了花粉** → [立即就医，不要等症状出现](GUIDE.md#cg-0004)
- 用了**狗用驱虫滴剂**后发抖、抽搐 → [立即就医](GUIDE.md#cg-0005)
- **张嘴喘气、呼吸费力** → [立即就医](GUIDE.md#cg-0029)
- **吞了线、绳子、丝带** → [马上就医，不要拉线头](GUIDE.md#cg-0031)
- **怀疑吃了有毒的东西** → [马上打电话，不要自己催吐](GUIDE.md#cg-0032)
- **后腿突然瘫软、剧痛** → [立即急诊](GUIDE.md#cg-0034)
- **高温天虚弱、倒地、大口喘** → [先降温，同时联系兽医](GUIDE.md#cg-0030)

## 这是什么

不是猫粮排行榜，不是导购，不是 AI 批量生成的养猫百科。

它想回答一个问题：**对普通养猫人来说，到底什么事情真正重要？**

- 哪些钱不能省？哪些可以省？哪些东西基本没必要买？
- 哪些事几乎不花钱，但收益很大？
- 哪些“养猫常识”其实证据不足？
- 什么时候可以观察，什么时候该预约，什么时候必须急诊？

每条建议都写明：**一句话结论、怎么做、收益、成本、证据等级、性价比、来源，以及这条来源具体支持了什么。**

## 怎么读

| 格式 | 地址 |
|---|---|
| 🌐 网站（搜索、筛选、收藏、离线） | [ljw729.github.io/cost-effective-cat-guide/](https://ljw729.github.io/cost-effective-cat-guide/) |
| 📄 PDF / 📚 EPUB / 📦 离线单文件 | [下载页](https://ljw729.github.io/cost-effective-cat-guide/downloads/) · [Releases](https://github.com/ljw729/cost-effective-cat-guide/releases) |
| 📝 Markdown | [GUIDE.md](GUIDE.md) |
| 🧩 结构化数据 | [`generated/guide.json`](generated/guide.json) |
| 🤖 AI Skill（Claude Code / Codex） | [`skills/cost-effective-cat-guide`](skills/cost-effective-cat-guide/) |

### 节选

| 条目 | 证据 | 性价比 |
|---|---|---|
| [家里不要放百合和萱草](GUIDE.md#cg-0003) | B | **S** |
| [不要给猫用狗用驱虫滴剂](GUIDE.md#cg-0005) | B | **S** |
| [不要照着网上的配方长期自制猫饭](GUIDE.md#cg-0009) | B | **S** |
| [封窗：窗户和阳台装牢固的防护网](GUIDE.md#cg-0001) | C | A |
| [植入芯片，并确保登记信息是最新的](GUIDE.md#cg-0002) | B | A |
| [每天给猫刷牙](GUIDE.md#cg-0019) | B | B |
| [自动饮水机值得买吗？](GUIDE.md#cg-0013) | C | D |
| [误区：一只猫一定很孤独，得再养一只](GUIDE.md#cg-0024) | B | 大多错误 |

最重要的事往往最便宜：S 级大多是几乎免费的“不要做”和安全措施。见 [预算优先级](docs/budget-priority.md)。

## 方法

- **证据等级** A 强 · B 中 · C 有限 · D 不足或有争议 → [evidence-methodology.md](docs/evidence-methodology.md)
- **性价比** S / A / B / C / D，公式公开、可复算，紧急情况和误区不评分 → [scoring-methodology.md](docs/scoring-methodology.md)
- **来源政策**：只用同行评议研究、兽医指南、兽医学院、专业组织和政府机构；社交平台只当线索 → [source-policy.md](docs/source-policy.md)
- **核验记录**：读到的是全文、摘要还是网页，哪些没读到 → [docs/verification/](docs/verification/2026-11-round-1.md)

来源存在 ≠ 来源支持结论。每条引用都写明它支持了什么，以及是否已核对。

## 内容体系

28 个一级分类（认识你的猫、品种与遗传、安全、有毒物质、饮食与营养、体重、饮水与泌尿、猫砂盆、医疗预防、牙齿、行为、多猫、幼猫、老年猫、早期信号、紧急情况、就医、省钱、值得买吗、选购原则、行为语言、领养、新猫到家、旅行搬家寄养、家庭应急、预算、不要做什么、误区）。见 [`data/taxonomy/categories.yaml`](data/taxonomy/categories.yaml)。目前已覆盖其中 27 个（“预算”分类还没有单独条目，但网站和 GUIDE 有自动生成的“钱先花在哪”）。

## 项目结构

```
data/entries/      每条知识一个 YAML（唯一的内容来源）
data/sources/      来源注册表与核验记录
data/taxonomy/     分类、搜索同义词、查重白名单
schema/            JSON Schema
src/               校验、评分、查重、过期检测、构建
scripts/           npm run 命令
tests/             单元测试
docs/              方法论与核验记录
generated/         构建产物（勿手改）
```

详见 [docs/architecture.md](docs/architecture.md)。

## 本地运行

```bash
npm install
npm run check           # 类型检查 + 校验 + 查重 + 测试 + 产物是否最新
npm run build:guide     # 重新生成 GUIDE.md
npm run verify:sources  # 联网核对 DOI（Crossref）
npm run stale           # 列出待复核条目
npm run build:all       # 网站 + PDF / EPUB / 离线版（PDF 需要本机有 Chrome 或 Edge）
npm run serve           # 本地预览网站 http://localhost:4173
```

需要 Node.js 20 或以上。

## 贡献

欢迎纠错、补充来源、提出新问题。每条新增建议必须有可靠来源、通过 Schema 和查重。涉及医疗的内容需要额外审核。
见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**特别欢迎执业兽医参与审核。**

## 商业中立

- 不接受付费排名，不做“十大最好猫粮”。
- 只写“怎么判断”，不推荐具体品牌（除非未来有独立、透明、可验证的评测体系）。
- 贡献者需要披露与相关品牌的利益关系。

## 隐私

网站无账号、无追踪、无广告，不加载任何第三方资源；收藏只存在你自己的浏览器里。

## 许可证

- **代码**（`src/`、`scripts/`、`tests/`、`schema/`、配置文件）：[MIT](LICENSE)
- **内容**（`data/`、`docs/`、`GUIDE.md`、`generated/`）：[CC BY-SA 4.0](LICENSE-CONTENT.md)

为什么这样分：代码用宽松许可，方便任何人复用校验和构建工具；内容用“署名-相同方式共享”，翻译版、App、打印版等衍生作品必须同样开放并注明出处，避免这份公共知识被改头换面后闭源。被引用论文和机构资料的版权归原作者，本项目只做转述和引用。

## 版本

遵循语义化版本。当前 `v0.7`：127 条（含品种与遗传、公母差异）、网站、PDF / EPUB / 离线版、AI Skill。内容仍是研究预览：没有条目经过兽医审核。路线图见 [ROADMAP.md](ROADMAP.md)，变更见 [CHANGELOG.md](CHANGELOG.md)。
