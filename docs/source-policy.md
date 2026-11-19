# 来源政策（Source Policy）

> 版本 0.1 · 适用于 `data/sources/sources.yaml` 中的每一条来源，以及 `data/entries/` 中每条知识对来源的引用。

本项目所有结论都必须能追溯到真实存在、可被他人复查的来源。**来源存在 ≠ 来源支持结论**——我们同时核对两件事。

## 1. 来源分层

| Tier | 含义 | 能否单独支撑医学事实 | 典型例子 |
|---|---|---|---|
| **1** | 同行评议研究、系统综述 / Meta 分析、兽医临床指南与共识声明、兽医学院、专业兽医组织、政府动物卫生机构 | ✅ 可以 | AAFP / ISFM 指南（JFMS）、AAHA 指南（JAAHA）、WSAVA 全球指南、JAVMA 研究、FDA CVM、Cornell Feline Health Center、ASPCA Animal Poison Control、Merck Veterinary Manual |
| **2** | 有明确作者和审核机制的兽医医院 / 大学科普、专业机构科普 | ⚠️ 只能支撑非高风险条目，或作为 Tier 1 的补充 | 署名兽医撰写并标明审核的医院教育页、iCatCare 面向主人的资料 |
| **3** | 社交媒体、论坛、普通博客、视频、商品评论 | ❌ 不能 | Reddit、知乎、小红书、抖音、B 站、YouTube |

Tier 3 只用于**发现问题**（“养猫人经常问什么”），写入 `data/taxonomy/question-signals.yaml`（规划中），**不出现在任何条目的 `sources` 里**。校验脚本会拒绝 Tier 3 来源被条目引用。

### 明确排除

以下内容不得作为证据：宠物品牌营销软文、电商详情页、网红广告、无来源文章、AI 生成文章、内容农场、无法追溯作者的信息。

品牌或厂商资助的研究 **不自动排除**（兽医营养学中很常见），但必须在来源的 `conflict_of_interest` 字段注明资助方，评定证据等级时考虑这一点。

## 2. 高风险主题的额外要求

涉及以下主题时，条目必须：至少 1 条 Tier 1 来源；`medical_review_required: true`；不得给出药物剂量；不得给出家庭治疗教程（急救只写“识别 → 避免错误操作 → 尽快就医”）。

> 疾病、药物、剂量、中毒、急救、营养缺乏、疫苗、驱虫、麻醉、手术、绝育、慢性病、肾脏、泌尿、呼吸、神经症状、外伤、误食异物、毒物暴露。

主题列表在 `data/taxonomy/categories.yaml` 中以 `high_risk: true` 标注，校验脚本自动执行。

## 3. 每条来源保存什么

见 `schema/source.schema.json`。关键字段：

- `title` / `organization` / `authors` / `year` / `container`（期刊名）
- `doi`（如有）、`url`、`pmid` / `pmcid`（如有）
- `source_type`：`systematic_review` · `meta_analysis` · `guideline` · `consensus_statement` · `rct` · `cohort` · `case_control` · `cross_sectional` · `case_series` · `experimental` · `narrative_review` · `government` · `organization_page` · `textbook`
- `tier`：1 / 2
- `accessed`：最近一次访问日期
- `archive_url`：Internet Archive 快照（如可获取；只存链接，不存全文）
- `verification`：见下节

## 4. 引用核验（Citation Verification）

每条来源有一条核验记录：

| 字段 | 含义 | 由谁填写 |
|---|---|---|
| `exists` | DOI 能在 Crossref 解析 / URL 返回 2xx | `npm run verify:sources` 自动 |
| `metadata_match` | Crossref 返回的标题、年份、第一作者与我们记录的一致 | 自动 |
| `read_level` | 我们实际读到了什么：`full_text` / `abstract` / `page` / `metadata_only` | 人工 / AI 研究员 |

每条**条目对来源的引用**还要写 `supports`（这条来源具体支持了什么，用自己的话）以及 `support_check`：

| 值 | 含义 |
|---|---|
| `pending` | 尚未核对来源是否支持该说法 |
| `ai_checked` | AI 研究员读过全文 / 摘要 / 页面，认为支持；**不等于兽医审核** |
| `human_checked` | 维护者人工核对过 |
| `vet_checked` | 持证兽医核对过 |

规则：

1. `metadata_only` 的来源，引用它的 `support_check` 只能是 `pending`。
2. 证据等级 A / B 的条目，至少一条 Tier 1 引用的 `support_check` 不是 `pending`。
3. 自动脚本**永远不会**修改 `support_check`、证据等级或医学结论；它只报告问题。

## 5. 版权

- 只写摘要与转述，引用原文单处不超过 15 个词 / 30 个汉字。
- 不保存论文全文；核验时下载的全文只放在本地 `.cache/`（已 gitignore）。
- 不复制来源的图片、图表。

## 6. 时效

医学类来源（`high_risk` 分类）复核周期 **18 个月**，其他 **36 个月**；超期条目由 `npm run stale` 列入待复核队列。指南有新版本时（例如 AAHA/AAFP 生命阶段指南更新），引用旧版本的条目都进入复核。

## 7. 当前已知限制（诚实记录）

- 2026-11 第一轮研究中，SAGE（JFMS）、AVMA 期刊网站和 JAAHA 网站拒绝自动抓取。论文类来源通过 Europe PMC 的公开摘要 / PMC 开放全文核对；没能读到的标记为 `metadata_only`，对应引用保持 `pending`。
- 本项目目前**没有**任何兽医审核过的条目。所有 `support_check` 最高为 `ai_checked`。
