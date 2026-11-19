# 证据等级方法（Evidence Methodology）

证据等级描述的是 **“这条具体建议有多可靠”**，不是“引用的机构有多权威”。一个权威指南里基于专家意见的一句话，和它基于多项研究的一句话，等级可以不同。

## 等级定义

| 等级 | 名称 | 典型依据 | 读者应该怎么理解 |
|---|---|---|---|
| **A** | 强证据 | 系统综述 / Meta 分析；多项一致的高质量研究；主要兽医指南中**明确基于研究证据**的推荐；毒理机制与病例数据都充分的中毒结论 | 结论不太可能被新研究推翻 |
| **B** | 中等证据 | Tier 1 机构的指南或共识声明（即使部分基于专家意见）；较可靠的观察性研究；多个专业来源一致 | 主流兽医界的共识做法，有一定研究支持 |
| **C** | 有限证据 | 小样本研究、单一研究、单一专家来源；存在合理生理学依据但缺少直接研究 | 合理，但不要把它当定论 |
| **D** | 证据不足 / 有争议 | 研究互相冲突、数据很少、主要依靠经验 | 目前**没有足够证据**得出强结论 |

D 类不删除。如果一个问题很流行但证据不足，我们专门写一条 `type: evidence_gap`，明确告诉读者“目前不知道”。这本身就是有用的信息——它能帮你省下为未经证实的东西付的钱。

## 自动校验的硬约束

`npm run validate` 会拒绝以下情况：

1. **A 级**条目没有任何 `systematic_review` / `meta_analysis` / `guideline` / `consensus_statement` / 多于 2 条 Tier 1 研究来源。
2. **A 或 B 级**条目没有 Tier 1 来源，或 Tier 1 引用全部是 `support_check: pending`。
3. 任何条目只有 Tier 2 来源却属于高风险分类。
4. `evidence_conflict: true` 却没有 `conflict_notes`。
5. 证据等级改变却没有 CHANGELOG 记录（规划中：通过 git diff 检查）。

## 证据冲突

两个可靠来源意见不同时，不偷偷选一个：

```yaml
evidence_conflict: true
conflict_notes:
  - position: 观点 1 的内容
    sources: [source-id-a]
  - position: 观点 2 的内容
    sources: [source-id-b]
  current_interpretation: 目前更合理的解释，以及它适用的条件
```

## 谁可以改证据等级

- AI 可以 **提议** 证据等级，但必须在 `evidence_summary` 中说明理由。
- 证据等级 **上调** 必须由人工维护者在 PR 中确认，并写入 CHANGELOG。
- 自动脚本永不修改证据等级。

## AI 研究 ≠ 兽医审核

`review_status` 字段如实记录：

| 值 | 含义 |
|---|---|
| `draft` | 初稿，未核对来源 |
| `ai_researched` | AI 研究员读过来源并核对过（全文 / 摘要 / 页面） |
| `maintainer_reviewed` | 人工维护者审核过 |
| `vet_reviewed` | 持证兽医审核过（需记录审核人与日期） |

网站和 AI Skill 会显示这个状态。高风险条目在达到 `vet_reviewed` 之前，页面会显示“尚未经兽医审核”的提示。
