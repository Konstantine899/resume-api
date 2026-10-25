import { z } from 'zod';
import { SafeSvg } from '../domain/safe-svg';

// ---- Shared primitives ----
export const localizedTextSchema = z
  .object({
    en: z.string().trim().min(1).max(600),
    ru: z.string().trim().min(1).max(600),
  })
  .strict();

const nonEmpty_trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const localRecord = <T extends z.ZodTypeAny>(schema: T) =>
  z.record(z.string().trim().min(1).max(48), schema);

// ---- About ----
export const aboutUpsertSchema = z
  .object({
    fullName: nonEmpty_trimmed(2, 80).optional(),
    descriptions: z.array(localizedTextSchema).min(1).max(60).optional(),
    stats: z.record(z.string().trim().min(1).max(48), localizedTextSchema).optional(),
    statLabels: z.record(z.string().trim().min(1).max(48), localizedTextSchema).optional(),
    ctaLabel: localizedTextSchema.nullable().optional(),
    portrait: z.string().trim().min(1).max(260).optional(),
  })
  .strict();

// ---- Contact ----
const socialLinkSchema = z
  .object({
    name: nonEmpty_trimmed(1, 48),
    href: z.string().trim().min(1).max(2048),
  })
  .strict();

export const contactUpsertSchema = z
  .object({
    email: z.string().trim().email().optional(),
    texts: z.record(nonEmpty_trimmed(1, 64), localizedTextSchema).optional(),
    formTexts: z.record(nonEmpty_trimmed(1, 64), localizedTextSchema).optional(),
    socialLinks: z.record(nonEmpty_trimmed(1, 48), socialLinkSchema).optional(),
  })
  .strict();

// ---- Projects ----
export const projectCreateSchema = z
  .object({
    title: nonEmpty_trimmed(2, 100),
    description: z.object({ en: z.string().trim().max(600), ru: z.string().trim().max(600) }),
    techIcons: z.array(z.string().trim().min(1).max(40)).max(20),
    link: z.string().trim().min(1).max(2048).nullable().optional(),
    image: z.string().trim().min(1).max(260),
    category: z.string().trim().max(48).optional(),
    status: z.string().trim().max(48).optional(),
    featured: z.boolean().default(false),
    role: z.object({ en: z.string().trim().max(200), ru: z.string().trim().max(200) }).optional(),
    metrics: z.array(z.string().trim().max(40)).max(10).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  })
  .strict();

export const projectUpdateSchema = z
  .object({
    title: nonEmpty_trimmed(2, 100).optional(),
    description: z
      .object({ en: z.string().trim().max(600), ru: z.string().trim().max(600) })
      .optional(),
    techIcons: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    link: z.string().trim().min(1).max(2048).nullable().optional(),
    image: z.string().trim().min(1).max(260).optional(),
    category: z.string().trim().max(48).optional(),
    status: z.string().trim().max(48).optional(),
    featured: z.boolean().optional(),
    role: z
      .object({ en: z.string().trim().max(200), ru: z.string().trim().max(200) })
      .nullable()
      .optional(),
    metrics: z.array(z.string().trim().max(40)).max(10).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  })
  .strict();

// ---- Skills / Technology ----
const techSchema = z.object({
  name: nonEmpty_trimmed(1, 48),
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
});

export const skillCategoryUpsertSchema = z
  .object({
    category: nonEmpty_trimmed(1, 48),
    categoryName: nonEmpty_trimmed(3, 50),
    technologies: z.array(techSchema).min(0).max(80),
  })
  .strict();

export const technologyUpsertSchema = z
  .object({
    key: nonEmpty_trimmed(1, 48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'technology key slug'),
    url: z.string().trim().min(1).max(2048),
    invertInDark: z.boolean().optional(),
  })
  .strict();

// ---- Jobs ----
export const jobCreateSchema = z
  .object({
    company: nonEmpty_trimmed(2, 80),
    position: z.object({
      en: z.string().trim().min(3).max(200),
      ru: z.string().trim().min(3).max(200),
    }),
    period: nonEmpty_trimmed(1, 64),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.object({
      en: z.array(z.string().trim().max(400)).max(50),
      ru: z.array(z.string().trim().max(400)).max(50),
    }),
    technologies: z.array(z.string().trim().min(1).max(48)).max(40).default([]),
    location: nonEmpty_trimmed(1, 80),
    current: z.boolean().default(false),
    employmentType: nonEmpty_trimmed(1, 48),
    level: nonEmpty_trimmed(1, 48),
    companyUrl: z.string().trim().min(1).max(2048).optional(),
    featured: z.boolean().default(false),
  })
  .strict();

export const jobUpdateSchema = z
  .object({
    company: nonEmpty_trimmed(2, 80).optional(),
    position: z
      .object({ en: z.string().trim().min(3).max(200), ru: z.string().trim().min(3).max(200) })
      .optional(),
    period: nonEmpty_trimmed(1, 64).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    description: z
      .object({
        en: z.array(z.string().trim().max(400)).max(50),
        ru: z.array(z.string().trim().max(400)).max(50),
      })
      .optional(),
    technologies: z.array(z.string().trim().min(1).max(48)).max(40).optional(),
    location: nonEmpty_trimmed(1, 80).optional(),
    current: z.boolean().optional(),
    employmentType: nonEmpty_trimmed(1, 48).optional(),
    level: nonEmpty_trimmed(1, 48).optional(),
    companyUrl: z.string().trim().min(1).max(2048).optional().nullable(),
    featured: z.boolean().optional(),
  })
  .strict();
