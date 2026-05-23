import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    cover: z.string().optional(),
    tags: z.array(z.string()),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    set: z.string().optional(),
  }),
});

export const collections = { posts };
