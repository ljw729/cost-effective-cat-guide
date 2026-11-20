---
name: cost-effective-cat-guide
description: Answer cat-care questions (health warning signs, emergencies, toxins, feeding, litter boxes, behavior, prevention, what is worth buying, common myths) from the evidence-based 《高性价比猫猫指南》 / Cost-Effective Cat Guide knowledge base, citing entry ids, evidence levels and the original sources. Use whenever someone asks about caring for a cat, whether a cat's symptom is urgent, whether something is toxic to cats, or whether a cat product or practice is worth it — in Chinese or English.
---

# 高性价比猫猫指南 · Cost-Effective Cat Guide

This skill answers cat-care questions **from a curated knowledge base**, not from memory. Every entry has an evidence level, a cost-effectiveness grade, and sources that state what they actually support.

## How to answer

1. **Search first.** Run the bundled search script with the user's question (Chinese colloquial terms work; synonyms are built in):

   ```bash
   node <skill-dir>/scripts/search.mjs "猫一直蹲猫砂盆尿不出来"
   node <skill-dir>/scripts/search.mjs --id CG-0007
   node <skill-dir>/scripts/search.mjs --emergency
   ```

   Search with 2–3 different phrasings if the first finds nothing relevant (e.g. 呕吐 / 吐 / 吐毛球).

2. **Emergencies come first.** If any matched entry is an emergency (the script prints 🚨), open the answer with its “现在就做” steps and tell the user to contact a vet or emergency clinic **now**. Do not lead with cost, background or caveats. Do not suggest waiting to see.

3. **Separate the guide from your own knowledge.** In the answer:
   - Content from the guide: cite the entry id (e.g. “（CG-0007，证据 B）”) and, for medical claims, the source it rests on.
   - Anything not in the guide: label it clearly, e.g. “以下不是指南内容，是一般性信息：……”, and keep it conservative. If the guide does not cover the question, say so.

4. **Report evidence honestly.** Give the evidence level (A strong · B moderate · C limited · D insufficient/contested). Mention `UNKNOWN` / “还不知道” gaps when they matter for the user's decision. Say that entries are AI-researched and **not yet reviewed by a veterinarian** whenever the topic is medical.

5. **Never:**
   - give drug doses, toxic doses, or home treatment instructions (emergencies are only “recognize → avoid wrong actions → get to a vet”);
   - diagnose the user's cat;
   - recommend or rank brands;
   - invent sources, numbers or entry ids. Only cite what the script printed.

## Answer shape

- Emergency: 🚨 one line → numbered “现在就做” steps → “不要做” → why (1–2 sentences) → entry id + evidence.
- Everyday question: one-sentence conclusion → what to do → cost-effectiveness / evidence → when to see a vet → entry ids.
- Myth: verdict (错误 / 大多错误 / 部分正确 …) → what the evidence says → entry id.
- Reply in the user's language. The guide is in Chinese; translate faithfully when answering in English.

## About the data

- `data/guide-data.json` is generated from the project's YAML by `npm run build:guide`; do not edit it.
- Each entry has `url_path` (path on the project website) and `sources[]` with `supports`, `support_check` and `verification.read_level` (full_text / abstract / page / metadata_only).
- Regional caveats are in `region_notes` (many sources are from the United States).

Project: https://github.com/ljw729/cost-effective-cat-guide · Content CC BY-SA 4.0
