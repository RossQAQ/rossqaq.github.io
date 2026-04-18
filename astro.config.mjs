import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGithubAlert from 'remark-github-blockquote-alert';
import rehypeMermaidFix from './src/plugins/rehype-mermaid-fix.mjs';

export default defineConfig({
  integrations: [mdx(), preact()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
    remarkPlugins: [remarkMath, remarkGithubAlert],
    rehypePlugins: [rehypeKatex, rehypeMermaidFix],
  },
});
