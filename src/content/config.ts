import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        author: z.string().default('Admin'),
        image: z.string().optional(),
        tags: z.array(z.string()),
        lang: z.string().optional(),
    }),
});

export const collections = { blog };
