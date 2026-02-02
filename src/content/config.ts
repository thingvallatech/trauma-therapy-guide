import { defineCollection, z } from 'astro:content';

const emdrPhasesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    phase: z.number().min(1).max(8),
    title: z.string(),
    shortTitle: z.string(),
    description: z.string(),
    goals: z.array(z.string()),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});

const resourcesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['book', 'pdf', 'article', 'video', 'worksheet', 'link']),
    audience: z.enum(['clinician', 'family', 'both']),
    tags: z.array(z.string()),
    url: z.string().default(''),
    fileUrl: z.string().default(''),
    author: z.string().default(''),
    dateAdded: z.coerce.date(),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});

export const collections = {
  'emdr-phases': emdrPhasesCollection,
  'resources': resourcesCollection,
};
