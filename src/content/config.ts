import { defineCollection, z } from 'astro:content';

const emdrPhasesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    phase: z.number().min(1).max(8),
    title: z.string(),
    shortTitle: z.string(),
    description: z.string(),
    goals: z.array(z.string()),
  }),
});

export const collections = {
  'emdr-phases': emdrPhasesCollection,
};
