# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal blog built with Astro 5 (static site generation), written in Chinese (zh-CN). All content is MDX. Interactive components use Preact with `client:load` hydration.

## Commands

This project uses fnm to manage Node.js. Before running any command, use `eval "$(fnm env)"` to activate fnm in the current shell.

```bash
eval "$(fnm env)"    # Activate fnm
npm run dev          # Start dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

No linter, formatter, or test runner is configured.

## Architecture

### Content

Blog posts live in `src/content/posts/` as `.mdx` files. The schema is defined in `src/content.config.ts` using Astro's content collections API. Frontmatter fields: `title`, `description`, `tags` (string array), `date`, `draft` (boolean, default false), `cover` (optional image path), `set` (optional series name for grouping posts).

A search index is generated at build time via `src/pages/search-index.json.ts` and consumed client-side by the SearchBar component.

### Layouts

- `BaseLayout.astro` — Root HTML shell (zh-CN lang), global CSS (~570 lines covering nav, prose, code blocks, tables, admonitions, responsive breakpoints), loads KaTeX CSS from CDN and three self-hosted fonts (TsangerJinKai for body, MapleMono for code, VictorMono Italic for logo). Includes SearchBar in nav.
- `PostLayout.astro` — Wraps BaseLayout. Adds cover image, post header, sticky sidebar TOC extracted from h2/h3 headings with scroll-tracking active state.

### Components

Preact components (`.tsx`) each have an `.astro` wrapper that applies `client:load`:
- **SearchBar** — fuse.js fuzzy search, lazy-loads search index on focus, keyboard navigation
- **AiChat** — Animated AI chat bubble with typewriter effect
- **WasmRunner** — Loads and runs .wasm files, renders pixel output to canvas

Pure Astro components: `TagList`, `AsmStructure`.

### Pages

- `index.astro` — Homepage timeline with card stacks. Posts with the same `set` frontmatter are grouped. `markdown-demo.mdx` is pinned to top.
- `posts/[...slug].astro` — Dynamic blog post rendering
- `tags/index.astro` — Tag cloud
- `tags/[tag].astro` — Posts filtered by tag

### Markdown Pipeline

Configured in `astro.config.mjs`:
- **Remark:** `remark-math`, `remark-github-blockquote-alert` (enables `> [!NOTE]`, `> [!TIP]`, etc.)
- **Rehype:** `rehype-katex`, custom `rehypeMermaidFix` plugin (`src/plugins/rehype-mermaid-fix.mjs`) using `mermaid-isomorphic` for server-side SVG rendering
- Code syntax highlighting via Shiki with `github-light` theme

### Styling

Pure CSS — no Tailwind or CSS framework. Global styles live in `BaseLayout.astro` using `<style is:global>`. Component-level styles use Astro's scoped `<style>` blocks. CSS custom properties are used for theming.
