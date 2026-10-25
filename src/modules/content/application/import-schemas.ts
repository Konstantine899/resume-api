import { z } from 'zod';

import { SafeSvg } from '../domain/safe-svg';

// ---------- shared primitives ----------
const localizedTextImportSchema = z
  .object({
    en: z.string().trim().min(1).max(600),
    ru: z.string().trim().min(1).max(600),
  })
  .strict();

const recordLocalized = z.record(z.string().trim().min(1).max(64), localizedTextImportSchema);

function normalizeLegacyDump(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  const pick = (target: string, names: string[]): void => {
    if (out[target] !== undefined) return;
    for (const name of names) {
      if (src[name] !== undefined) {
        out[target] = src[name];
        return;
      }
    }
  };

  pick('about', ['about', 'aboutContent', 'about_content', 'aboutData']);
  pick('contact', ['contact', 'contactContent', 'contact_content', 'contactData']);
  pick('projects', ['projects', 'project', 'projectsList']);
  pick('skillCategories', [
    'skillCategories',
    'skills',
    'skill_categories',
    'categories',
    'skillCategory',
  ]);
  pick('jobs', ['jobs', 'job', 'workHistory', 'work_history', 'employment', 'experiences']);
  pick('technologies', ['technologies', 'technology', 'tech', 'techList']);

  return out;
}

// ---------- aggregate import schemas (legacy shape, lenient defaults) ----------
export const aboutImportSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    fullName: z.string().trim().min(2).max(80),
    descriptions: z.array(localizedTextImportSchema).min(1).max(60).default([]),
    stats: z.record(z.string().trim().min(1).max(40), localizedTextImportSchema).default({}),
    statLabels: z.record(z.string().trim().min(1).max(40), localizedTextImportSchema).optional(),
    ctaLabel: localizedTextImportSchema.nullable().optional(),
    portrait: z.string().trim().min(1).max(260).optional(),
  })
  .passthrough();

export const contactImportSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    email: z.string().trim().email(),
    texts: recordLocalized.default({}),
    formTexts: recordLocalized.default({}),
    socialLinks: z
      .record(
        z.string().trim().min(1).max(48),
        z
          .object({
            name: z.string().trim().min(1).max(48),
            href: z.string().trim().min(1).max(2048),
          })
          .passthrough(),
      )
      .default({}),
  })
  .passthrough();

const projectLocalized = z.object({
  en: z.string().trim().max(600),
  ru: z.string().trim().max(600),
});

export const projectImportSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    title: z.string().trim().min(0).max(100).default(''),
    description: projectLocalized,
    techIcons: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    link: z.string().trim().min(1).max(2048).nullable().optional(),
    image: z.string().trim().max(260).default(''),
    category: z.string().trim().max(48).optional(),
    status: z.string().trim().max(48).optional(),
    featured: z.boolean().default(false),
    role: z
      .object({ en: z.string().trim().max(200), ru: z.string().trim().max(200) })
      .nullable()
      .optional(),
    metrics: z.array(z.string().trim().max(40)).max(10).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  })
  .passthrough();

export const skillTechnologyImportSchema = z
  .object({
    name: z.string().trim().min(1).max(48),
    iconSvg: z
      .string()
      .trim()
      .min(1)
      .refine((v) => {
        try {
          SafeSvg.of(v);
          return true;
        } catch {
          return false;
        }
      }, 'Skill iconSvg is not safe'),
    invertInDark: z.boolean().optional(),
    iconFilter: z.string().trim().max(120).optional(),
  })
  .passthrough();

export const skillCategoryImportSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    category: z.string().trim().min(1).max(48),
    categoryName: z.string().trim().min(3).max(50),
    technologies: z.array(skillTechnologyImportSchema).max(80).default([]),
  })
  .passthrough();

export const jobImportSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    company: z.string().trim().min(2).max(80),
    position: z.object({
      en: z.string().trim().min(3).max(200),
      ru: z.string().trim().min(3).max(200),
    }),
    period: z.string().trim().min(1).max(64),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.object({
      en: z.array(z.string().trim().max(400)).max(50).default([]),
      ru: z.array(z.string().trim().max(400)).max(50).default([]),
    }),
    technologies: z.array(z.string().trim().min(1).max(48)).max(40).default([]),
    location: z.string().trim().min(1).max(80),
    current: z.boolean().default(false),
    employmentType: z.string().trim().min(1).max(48),
    level: z.string().trim().min(1).max(48),
    companyUrl: z.string().trim().min(1).max(2048).optional(),
    featured: z.boolean().default(false),
  })
  .passthrough();

export const technologyImportSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(48)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'technology key slug'),
    url: z.string().trim().min(1).max(2048),
    invertInDark: z.boolean().optional(),
  })
  .passthrough();

export const legacyImportSchema = z.preprocess(
  normalizeLegacyDump,
  z
    .object({
      about: aboutImportSchema.nullable().optional(),
      contact: contactImportSchema.nullable().optional(),
      projects: z.array(projectImportSchema).default([]),
      skillCategories: z.array(skillCategoryImportSchema).default([]),
      jobs: z.array(jobImportSchema).default([]),
      technologies: z.array(technologyImportSchema).default([]),
    })
    .passthrough(),
);

export type LegacyImportPayload = z.infer<typeof legacyImportSchema>;
export type AboutImportPayload = z.infer<typeof aboutImportSchema>;
export type ContactImportPayload = z.infer<typeof contactImportSchema>;
export type ProjectImportPayload = z.infer<typeof projectImportSchema>;
export type SkillCategoryImportPayload = z.infer<typeof skillCategoryImportSchema>;
export type JobImportPayload = z.infer<typeof jobImportSchema>;
export type TechnologyImportPayload = z.infer<typeof technologyImportSchema>;

// Backwards/alias names that callers or tests might expect.
export const contentImportSchema = legacyImportSchema;
export const legacyImportDumpSchema = legacyImportSchema;
export const importDumpSchema = legacyImportSchema;
export const legacyImportPayloadSchema = legacyImportSchema;
