# 给 AI 编码助手的说明（AGENTS.md）

本仓库是一个**循证**养猫知识库。在这里修改内容时，下面这些规则比“把活干完”更重要。

## 内容规则（不可协商）

- **不编造**来源、DOI、PMID、作者、机构指南或数字。凭记忆写的 DOI 必须先用 `npm run verify:sources` 核对。
- **来源存在 ≠ 来源支持结论。**
  - 每条引用都要写 `supports`，内容是你实际读到的东西。
  - 只读到元数据的来源，`support_check` 必须是 `pending`。
- 读不到的内容写进 `evidence.gaps`，标 `UNKNOWN` 或 `TODO`，**不写进正文**。
- 不写药物剂量或中毒剂量。急症只写“识别 → 避免错误操作 → 尽快就医”。
- 证据等级**上调**必须由人类维护者确认，并记录到 `CHANGELOG.md`。新条目的初始评级要保守。
- 不推荐品牌，不做排行。
- 网站拒绝访问或显示人机验证时，**不要绕过**，在核验记录里如实写明。

## 工作流程

```bash
npm install
npm run check          # 类型检查 + 校验 + 查重 + 测试 + 生成物是否最新
npm run build:guide    # 改了 data/ 之后重新生成 GUIDE.md、generated/、skills/*/data/
npm run build:all      # 网站 + PDF/EPUB/离线版（PDF 需要本机有 Chrome 或 Edge）
```

- 新条目：`data/entries/<分类>/<slug>.yaml`，编号顺延，**编号永不复用**。字段说明见 `schema/entry.schema.json`。
- 新来源：先登记到 `data/sources/sources.yaml`，再在条目里引用。
- 每完成一个逻辑阶段就提交一次。

## 用这份知识库回答养猫问题

参见 `skills/cost-effective-cat-guide/SKILL.md`。
