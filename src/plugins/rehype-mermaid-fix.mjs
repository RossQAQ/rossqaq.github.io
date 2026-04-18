import { visitParents } from 'unist-util-visit-parents';
import { toText } from 'hast-util-to-text';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { createMermaidRenderer } from 'mermaid-isomorphic';

export default function rehypeMermaidFix() {
  let renderDiagrams = null;

  return async (tree) => {
    const instances = [];

    visitParents(tree, 'element', (node, ancestors) => {
      if (
        node.tagName === 'pre' &&
        node.properties?.dataLanguage === 'mermaid'
      ) {
        const diagram = toText(node).trim();
        instances.push({ node, ancestors, diagram });
      }
    });

    if (!instances.length) return;

    if (!renderDiagrams) {
      renderDiagrams = await createMermaidRenderer();
    }

    const results = await renderDiagrams(
      instances.map((i) => i.diagram),
      { screenshot: false }
    );

    for (let i = instances.length - 1; i >= 0; i--) {
      const { node, ancestors } = instances[i];
      const result = results[i];
      const parent = ancestors.at(-1);

      if (result.status === 'rejected') {
        console.warn('Mermaid render error:', result.reason?.message || result.reason);
        continue;
      }

      const frag = fromHtmlIsomorphic(result.value.svg, { fragment: true });
      parent.children[parent.children.indexOf(node)] = frag.children[0];
    }
  };
}
