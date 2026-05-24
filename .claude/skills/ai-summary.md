# AI Summary Skill

Generate an AI summary for a blog post MDX file and insert it into the `## AI 总结` section.

## Trigger

When the user asks to summarize a blog post or write an AI summary, e.g.:
- "帮我总结这篇文章"
- "写个 AI 总结"
- "总结下这篇笔记"

## Steps

1. **Read the target MDX file** — get the full content of the post.

2. **Proofread** — carefully check the Chinese text for common errors:
   - 拼音输入法误选（如 "知识" → "只是"，"以为" → "以为/已为"）
   - 英文拼写错误（如 "Posgresql" → "PostgreSQL"）
   - 标点符号不一致

3. **Cross-check with own knowledge** — compare the post's technical claims against your own knowledge. If you find anything that seems inaccurate or questionable:
   - **Do NOT modify the original text.**
   - List the questionable points separately and ask the user to confirm before making any changes.
   - Only fix them after explicit user approval.

4. **Fix confirmed errors** — apply all user-approved corrections to the original text.

5. **Generate summary** — write a concise Chinese summary (2-3 paragraphs) covering:
   - 文章主题和核心论点
   - 关键要点（用无序列表，每项加粗关键词 + 破折号说明）
   - Avoid restating the title verbatim; provide actual value.

6. **Insert into the file** using the `<AiChat>` component:

   ```mdx
   ## AI 总结

   <AiChat
     question="帮我总结这篇 {文章标题} 的笔记"
     answer="总结内容...

   核心要点：

   - **要点1** — 说明
   - **要点2** — 说明"
   />
   ```

7. **Ensure import exists** — if the file does not already have it, add this import right after the frontmatter (`---`):

   ```
   import AiChat from "../../components/AiChat.astro";
   ```

8. **Verify** — read the file back to confirm the import, `<AiChat>` tag, and closing `/>` are all correct.

## Rules

- Summary must be in Chinese (zh-CN), matching the blog's language.
- The `question` attribute should be a natural user question like "帮我总结这篇 {title} 的笔记".
- The `answer` attribute is a multi-line string containing the full summary with markdown formatting (bold, lists, etc.).
- Always self-close with `/>`.
- The `## AI 总结` heading stays **outside** the `<AiChat>` tag — only the content goes inside.
- If the file already has content under `## AI 总结`, replace it. If the section doesn't exist, add it right after the import line.
- **Never modify original content based on your own knowledge without explicit user approval.** Raise questionable points as suggestions and wait for confirmation.
