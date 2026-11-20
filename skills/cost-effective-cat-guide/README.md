# AI Skill：高性价比猫猫指南

让 AI 助手**从这份知识库里**回答养猫问题，而不是凭记忆：

- 回答时引用条目编号、证据等级和原始来源；
- 遇到急症，先给出行动步骤；
- 明确区分“指南内容”和“模型自身知识”。

文件夹是自包含的。`data/guide-data.json` 由 `npm run build:guide` 生成，搜索脚本只需要 Node.js 18+，没有其他依赖。

## 安装

### Claude Code

```bash
# 个人：所有项目都可用
cp -r skills/cost-effective-cat-guide ~/.claude/skills/

# 或者只在某个项目里用
cp -r skills/cost-effective-cat-guide <你的项目>/.claude/skills/
```

之后直接问“猫一直蹲猫砂盆尿不出来怎么办”，Claude 会按 `SKILL.md` 的说明调用搜索脚本。

### Codex 和其他支持 Agent Skills（`SKILL.md`）格式的工具

把整个文件夹复制到该工具的 skills 目录，具体位置见该工具的文档。

如果工具不支持 skills：把 `SKILL.md` 正文复制到项目的 `AGENTS.md`（或同类说明文件）里，并把路径改成搜索脚本所在的实际位置。

## 直接使用搜索脚本

```bash
node scripts/search.mjs 猫吐了
node scripts/search.mjs --id CG-0007
node scripts/search.mjs --emergency
node scripts/search.mjs --categories
node scripts/search.mjs --category toxins
```

## 局限

- 知识库目前**没有任何条目经过兽医审核**。
- 很多来源来自美国，地区差异写在每个条目的 `region_notes` 字段里。
- 搜索是关键词加同义词匹配，不是语义检索。如果找不到结果，AI 应该换个说法再搜，或者明确告诉用户“指南里没有这部分内容”。
