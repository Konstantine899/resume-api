import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  type E2EContext,
} from '../auth/e2e-helpers';

const PASSWORD = 'e2e-import-password-123';
const EMAIL = `import-e2e-${randomBytes(6).toString('hex')}@e2e.test`;
const VALID_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>';

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let token: string;

async function resetContent(prisma: E2EContext['prisma']): Promise<void> {
  await prisma.project.deleteMany({});
  await prisma.skillCategory.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.technology.deleteMany({});
  await prisma.aboutContent.deleteMany({});
  await prisma.contactContent.deleteMany({});
}

const dump = {
  about: {
    fullName: 'Imported User',
    descriptions: [{ en: 'desc', ru: 'описание' }],
    stats: { years: { en: '5', ru: '5' } },
    ctaLabel: null,
  },
  contact: {
    email: 'import@example.test',
    texts: { hero: { en: 'hi', ru: 'привет' } },
    formTexts: { submit: { en: 'send', ru: 'отправить' } },
    socialLinks: { github: { name: 'GitHub', href: 'https://github.com/example' } },
  },
  projects: [
    {
      title: 'Imported Project',
      description: { en: 'pdesc', ru: 'описание проекта' },
      techIcons: [],
      image: '',
      featured: false,
    },
  ],
  skillCategories: [
    {
      category: 'backend',
      categoryName: 'Backend',
      technologies: [{ name: 'Node', iconSvg: VALID_SVG }],
    },
  ],
  jobs: [
    {
      company: 'ACME',
      position: { en: 'Engineer', ru: 'Инженер' },
      period: '2020 - 2021',
      startDate: '2020-01-01',
      endDate: null,
      description: { en: ['did things'], ru: ['сделал'] },
      technologies: ['Node'],
      location: 'Remote',
      current: false,
      employmentType: 'Full-time',
      level: 'Senior',
      featured: false,
    },
  ],
  technologies: [{ key: 'node', url: '/images/node.svg' }],
};

beforeAll(async () => {
  ctx = await bootApp(env);
  await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
  await resetContent(ctx.prisma);

  const login = await request(ctx.app.getHttpServer())
    .post('/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  expect(login.status).toBe(200);
  token = login.body.accessToken as string;
});

afterAll(async () => {
  await resetContent(ctx.prisma);
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
});

describe('POST /content/import', () => {
  it('returns preview counts without writing in dry-run mode', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/content/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ dump, dryRun: true });

    expect(response.status).toBe(200);
    expect(response.body.dryRun).toBe(true);
    expect(response.body.willWrite).toBe(false);
    expect(response.body.applied).toBe(false);
    expect(response.body.counts.total).toBe(6);
    expect(response.body.new).toBe(6);
    expect(response.body.updated).toBe(0);
    expect(Array.isArray(response.body.validationErrors)).toBe(true);
    expect(response.body.validationErrors).toHaveLength(0);

    expect(await ctx.prisma.project.count()).toBe(0);
    expect(await ctx.prisma.technology.count()).toBe(0);
  });

  it('applies the dump when dryRun is false', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/content/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ dump, dryRun: false });

    expect(response.status).toBe(200);
    expect(response.body.dryRun).toBe(false);
    expect(response.body.applied).toBe(true);
    expect(response.body.willWrite).toBe(true);

    expect(await ctx.prisma.project.count()).toBe(1);
    expect(await ctx.prisma.skillCategory.count()).toBe(1);
    expect(await ctx.prisma.job.count()).toBe(1);
    expect(await ctx.prisma.technology.count()).toBe(1);
    expect(await ctx.prisma.aboutContent.count()).toBe(1);
    expect(await ctx.prisma.contactContent.count()).toBe(1);
  });

  it('requires an admin token', async () => {
    const anonymous = await request(ctx.app.getHttpServer())
      .post('/content/import')
      .send({ dump, dryRun: true });
    expect(anonymous.status).toBe(401);
  });
});
