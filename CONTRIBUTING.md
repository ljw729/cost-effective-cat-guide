# 贡献指南

谢谢你愿意帮忙。这个项目的优先级是：**正确性 > 来源可靠 > 安全 > 结构化 > 易读 > 内容数量 > 功能数量 > 视觉效果**。

## 你可以怎么帮

| 想做的事 | 入口 |
|---|---|
| 发现内容错误 | 提 issue：内容纠错 |
| 发现医疗信息问题 | 提 issue：医疗信息问题（优先处理） |
| 有新研究或新版指南 | 提 issue：新研究 |
| 来源链接失效 | 提 issue：来源失效 |
| 想新增一条建议 | 先提 issue：新增建议，讨论后再提 PR |
| 你是执业兽医 | 非常欢迎审核高风险条目，请在 issue 中说明 |

## 新增一条建议的要求

1. **先查重**：搜索 `data/entries/`，相近的内容应该合并或补充。
2. **来源**：至少一条 Tier 1 来源（高风险分类必须）。先登记到 `data/sources/sources.yaml`，运行 `npm run verify:sources`。
3. **写清楚来源支持什么**：`sources[].supports` 用自己的话写，附 `locator`（段落、表格、页码）。只读到元数据的来源，`support_check` 必须是 `pending`。
4. **证据等级**：按 [evidence-methodology.md](docs/evidence-methodology.md) 填写，并在 `evidence.summary` 说明理由。
5. **评分**：按 [scoring-methodology.md](docs/scoring-methodology.md) 的锚点填，在 `scores.rationale` 写理由。不要手填性价比等级，它是算出来的。
6. **适用对象**、**例外**、**警示信号**都要写。
7. **不确定就写出来**：放进 `evidence.gaps`，标 `TODO / NEED REVIEW / UNKNOWN`。不要为了完整而编。
8. 运行 `npm run check`，全部通过。

文件放在 `data/entries/<分类>/<slug>.yaml`，`id` 用下一个未使用的 `CG-xxxx`（id 永不复用）。

## 医疗内容的额外规则

- 不写药物剂量（校验会拒绝）。
- 急救只写：识别危险 → 避免错误操作 → 尽快就医。不写家庭治疗教程。
- 高风险分类必须 `medical_review_required: true`。
- `review_status: vet_reviewed` 只能由真实的兽医审核后设置，并记录在 `reviewers` 中。

## 不接受的内容

- 无来源的医学说法、AI 生成但没核对来源的内容
- 品牌推荐、排行榜、带货链接
- 以营销软文、电商详情页、网红视频、论坛帖子作为证据
- 复制来源的大段原文或图片

## 利益冲突

如果你与某个品牌、厂商、医院有关系（雇佣、资助、赞助、联盟营销），请在 PR 中披露。有利益关系不代表不能贡献，但审核会更严格。本项目不接受付费排名。

## 修改已有结论

- 修改医学结论或证据等级时，在 PR 说明原因并附来源。
- 写进 [CHANGELOG.md](CHANGELOG.md)。
- 证据等级**上调**需要维护者确认。

## 使用 AI 协助

可以用 AI 总结论文、整理资料、起草和改文字。但你要对内容负责：每个来源必须真实存在、你确认过它支持该说法。不要提交 AI 编造的论文或 DOI——`npm run verify:sources` 会核对。

## 开发

```bash
npm install
npm run check
```

代码风格：TypeScript strict。修改 `src/scoring.ts` 时必须同步 `docs/scoring-methodology.md` 和测试。
