import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft && !data.unpublish);

  const index = posts.map((post) => ({
    slug: post.id,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    body: post.body ?? '',
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
