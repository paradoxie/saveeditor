import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        author: z.string().default('Admin'),
        image: z.string().optional(),
        tags: z.array(z.string()),
        lang: z.string().optional(),
    }),
});

const compatibility = defineCollection({
    type: 'content',
});

const matrix = defineCollection({
    type: 'content',
});

export const collections = { blog, compatibility, matrix };
