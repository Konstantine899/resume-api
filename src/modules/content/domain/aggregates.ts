import { randomUUID } from 'node:crypto';

import type { LocalizedText } from './localized-text';
import { LocalizedText as LT } from './localized-text';
import { SafeSvg } from './safe-svg';
import { ContentDomainError } from './content-domain-error';

const assert = (cond: boolean, msg: string): void => {
  if (!cond) throw new ContentDomainError(msg);
};

// ---- Technology ----
export interface TechnologyProps {
  key: string;
  url: string;
  invertInDark?: boolean;
  updatedAt: Date;
}
export class Technology {
  private props: TechnologyProps;
  private constructor(props: TechnologyProps) {
    this.props = props;
  }
  static create(input: { key: string; url: string; invertInDark?: boolean }): Technology {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.key), 'Technology.key invalid slug');
    assert(input.url.length > 0, 'Technology.url required');
    return new Technology({
      key: input.key,
      url: input.url,
      invertInDark: input.invertInDark,
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: TechnologyProps): Technology {
    return new Technology(props);
  }
  get key() {
    return this.props.key;
  }
  get url() {
    return this.props.url;
  }
  get invertInDark() {
    return this.props.invertInDark;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  toProps(): TechnologyProps {
    return { ...this.props };
  }
}

// ---- AboutContent ----
export interface AboutContentProps {
  id: string;
  fullName: string;
  descriptions: LocalizedText[];
  stats: Record<string, LocalizedText>;
  statLabels?: Record<string, LocalizedText>;
  ctaLabel: LocalizedText | null;
  portrait?: string;
  updatedAt: Date;
}
export class AboutContent {
  private props: AboutContentProps;
  private constructor(props: AboutContentProps) {
    this.props = props;
  }
  static create(
    input: Omit<AboutContentProps, 'id' | 'updatedAt'> & { id?: string },
  ): AboutContent {
    assert(
      input.fullName.trim().length >= 2 && input.fullName.trim().length <= 80,
      'About.fullName invalid',
    );
    return new AboutContent({
      id: input.id ?? 'singleton',
      fullName: input.fullName.trim(),
      descriptions: input.descriptions,
      stats: input.stats,
      statLabels: input.statLabels,
      ctaLabel: input.ctaLabel,
      portrait: input.portrait,
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: AboutContentProps): AboutContent {
    return new AboutContent(props);
  }
  get id() {
    return this.props.id;
  }
  get fullName() {
    return this.props.fullName;
  }
  get descriptions() {
    return this.props.descriptions;
  }
  get stats() {
    return this.props.stats;
  }
  get statLabels() {
    return this.props.statLabels;
  }
  get ctaLabel() {
    return this.props.ctaLabel;
  }
  get portrait() {
    return this.props.portrait;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  update(input: Partial<Omit<AboutContentProps, 'id' | 'updatedAt'>>): void {
    if (input.fullName !== undefined) {
      assert(
        input.fullName.trim().length >= 2 && input.fullName.trim().length <= 80,
        'About.fullName invalid',
      );
      this.props.fullName = input.fullName.trim();
    }
    if (input.descriptions !== undefined) this.props.descriptions = input.descriptions;
    if (input.stats !== undefined) this.props.stats = input.stats;
    if (input.statLabels !== undefined) this.props.statLabels = input.statLabels;
    if (input.ctaLabel !== undefined) this.props.ctaLabel = input.ctaLabel;
    if (input.portrait !== undefined) this.props.portrait = input.portrait;
    this.props.updatedAt = new Date();
  }
  toProps(): AboutContentProps {
    return { ...this.props };
  }
}

// ---- ContactContent ----
export interface ContactContentProps {
  id: string;
  email: string;
  texts: Record<string, LocalizedText>;
  formTexts: Record<string, LocalizedText>;
  socialLinks: Record<string, { name: string; href: string }>;
  updatedAt: Date;
}
export class ContactContent {
  private props: ContactContentProps;
  private constructor(props: ContactContentProps) {
    this.props = props;
  }
  static create(
    input: Omit<ContactContentProps, 'id' | 'updatedAt'> & { id?: string },
  ): ContactContent {
    assert(input.email.trim().length > 0, 'Contact.email required');
    return new ContactContent({
      id: input.id ?? 'singleton',
      email: input.email.trim(),
      texts: input.texts,
      formTexts: input.formTexts,
      socialLinks: input.socialLinks,
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: ContactContentProps): ContactContent {
    return new ContactContent(props);
  }
  get id() {
    return this.props.id;
  }
  get email() {
    return this.props.email;
  }
  get texts() {
    return this.props.texts;
  }
  get formTexts() {
    return this.props.formTexts;
  }
  get socialLinks() {
    return this.props.socialLinks;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  update(input: Partial<Omit<ContactContentProps, 'id' | 'updatedAt'>>): void {
    if (input.email !== undefined) this.props.email = input.email.trim();
    if (input.texts !== undefined) this.props.texts = input.texts;
    if (input.formTexts !== undefined) this.props.formTexts = input.formTexts;
    if (input.socialLinks !== undefined) this.props.socialLinks = input.socialLinks;
    this.props.updatedAt = new Date();
  }
  toProps(): ContactContentProps {
    return { ...this.props };
  }
}

// ---- Project ----
export interface ProjectProps {
  id: string;
  title: string;
  description: { en: string; ru: string };
  techIcons: string[];
  link: string | null;
  image: string;
  category?: string;
  status?: string;
  featured: boolean;
  role?: { en: string; ru: string };
  metrics?: string[];
  year?: number;
  createdAt?: Date;
  updatedAt: Date;
}
export class Project {
  private props: ProjectProps;
  private constructor(props: ProjectProps) {
    this.props = props;
  }
  static create(
    input: Omit<ProjectProps, 'id' | 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: Date },
  ): Project {
    assert(
      input.title === '' || (input.title.trim().length >= 2 && input.title.trim().length <= 100),
      'Project.title invalid',
    );
    return new Project({
      id: input.id ?? randomUUID(),
      title: input.title.trim(),
      description: input.description,
      techIcons: input.techIcons,
      link: input.link,
      image: input.image,
      category: input.category,
      status: input.status,
      featured: input.featured,
      role: input.role,
      metrics: input.metrics,
      year: input.year,
      createdAt: input.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: ProjectProps): Project {
    return new Project(props);
  }
  get id() {
    return this.props.id;
  }
  get title() {
    return this.props.title;
  }
  get description() {
    return this.props.description;
  }
  get techIcons() {
    return this.props.techIcons;
  }
  get link() {
    return this.props.link;
  }
  get image() {
    return this.props.image;
  }
  get category() {
    return this.props.category;
  }
  get status() {
    return this.props.status;
  }
  get featured() {
    return this.props.featured;
  }
  get role() {
    return this.props.role;
  }
  get metrics() {
    return this.props.metrics;
  }
  get year() {
    return this.props.year;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  update(input: Partial<Omit<ProjectProps, 'id' | 'updatedAt' | 'createdAt'>>): void {
    if (input.title !== undefined) {
      assert(
        input.title === '' || (input.title.trim().length >= 2 && input.title.trim().length <= 100),
        'Project.title invalid',
      );
      this.props.title = input.title.trim();
    }
    if (input.description !== undefined) this.props.description = input.description;
    if (input.techIcons !== undefined) this.props.techIcons = input.techIcons;
    if (input.link !== undefined) this.props.link = input.link;
    if (input.image !== undefined) this.props.image = input.image;
    if (input.category !== undefined) this.props.category = input.category;
    if (input.status !== undefined) this.props.status = input.status;
    if (input.featured !== undefined) this.props.featured = input.featured;
    if (input.role !== undefined) this.props.role = input.role;
    if (input.metrics !== undefined) this.props.metrics = input.metrics;
    if (input.year !== undefined) this.props.year = input.year;
    this.props.updatedAt = new Date();
  }
  toProps(): ProjectProps {
    return { ...this.props };
  }
}

// ---- SkillCategory ----
export interface SkillTechnologyProps {
  name: string;
  iconSvg: string;
  invertInDark?: boolean;
  iconFilter?: string;
}
export interface SkillCategoryProps {
  id: string;
  category: string;
  categoryName: string;
  technologies: SkillTechnologyProps[];
  updatedAt: Date;
}
export class SkillCategory {
  private props: SkillCategoryProps;
  private constructor(props: SkillCategoryProps) {
    this.props = props;
  }
  static create(
    input: Omit<SkillCategoryProps, 'id' | 'updatedAt'> & { id?: string },
  ): SkillCategory {
    assert(
      input.categoryName.trim().length >= 3 && input.categoryName.trim().length <= 50,
      'Skill.categoryName invalid',
    );
    const names = input.technologies.map((t) => t.name);
    assert(new Set(names).size === names.length, 'Skill duplicate technology');
    for (const tech of input.technologies) {
      try {
        SafeSvg.of(tech.iconSvg);
      } catch {
        throw new ContentDomainError('SkillTechnology.iconSvg must be safe SVG');
      }
    }
    return new SkillCategory({
      id: input.id ?? randomUUID(),
      category: input.category,
      categoryName: input.categoryName.trim(),
      technologies: input.technologies,
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: SkillCategoryProps): SkillCategory {
    return new SkillCategory(props);
  }
  get id() {
    return this.props.id;
  }
  get category() {
    return this.props.category;
  }
  get categoryName() {
    return this.props.categoryName;
  }
  get technologies() {
    return this.props.technologies;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  update(input: Partial<Omit<SkillCategoryProps, 'id' | 'updatedAt'>>): void {
    if (input.category !== undefined) this.props.category = input.category;
    if (input.categoryName !== undefined) this.props.categoryName = input.categoryName.trim();
    if (input.technologies !== undefined) {
      const names = input.technologies.map((t) => t.name);
      assert(new Set(names).size === names.length, 'Skill duplicate technology');
      for (const tech of input.technologies) {
        try {
          SafeSvg.of(tech.iconSvg);
        } catch {
          throw new ContentDomainError('SkillTechnology.iconSvg must be safe SVG');
        }
      }
      this.props.technologies = input.technologies;
    }
    this.props.updatedAt = new Date();
  }
  toProps(): SkillCategoryProps {
    return { ...this.props };
  }
}

// ---- Job ----
export interface JobProps {
  id: string;
  company: string;
  position: { en: string; ru: string };
  period: string;
  startDate: Date;
  endDate: Date | null;
  description: { en: string[]; ru: string[] };
  technologies: string[];
  location: string;
  current: boolean;
  employmentType: string;
  level: string;
  companyUrl?: string;
  featured: boolean;
  createdAt?: Date;
  updatedAt: Date;
}
export class Job {
  private props: JobProps;
  private constructor(props: JobProps) {
    this.props = props;
  }
  static create(
    input: Omit<JobProps, 'id' | 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: Date },
  ): Job {
    assert(
      input.company.trim().length >= 2 && input.company.trim().length <= 80,
      'Job.company invalid',
    );
    assert(input.position.en.trim().length >= 3, 'Job.position en invalid');
    assert(input.position.ru.trim().length >= 3, 'Job.position ru invalid');
    return new Job({
      id: input.id ?? randomUUID(),
      company: input.company.trim(),
      position: input.position,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      technologies: input.technologies,
      location: input.location.trim(),
      current: input.current,
      employmentType: input.employmentType,
      level: input.level,
      companyUrl: input.companyUrl,
      featured: input.featured,
      createdAt: input.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
  }
  static reconstitute(props: JobProps): Job {
    return new Job(props);
  }
  get id() {
    return this.props.id;
  }
  get company() {
    return this.props.company;
  }
  get position() {
    return this.props.position;
  }
  get period() {
    return this.props.period;
  }
  get startDate() {
    return this.props.startDate;
  }
  get endDate() {
    return this.props.endDate;
  }
  get description() {
    return this.props.description;
  }
  get technologies() {
    return this.props.technologies;
  }
  get location() {
    return this.props.location;
  }
  get current() {
    return this.props.current;
  }
  get employmentType() {
    return this.props.employmentType;
  }
  get level() {
    return this.props.level;
  }
  get companyUrl() {
    return this.props.companyUrl;
  }
  get featured() {
    return this.props.featured;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  update(input: Partial<Omit<JobProps, 'id' | 'updatedAt' | 'createdAt'>>): void {
    if (input.company !== undefined) this.props.company = input.company.trim();
    if (input.position !== undefined) this.props.position = input.position;
    if (input.period !== undefined) this.props.period = input.period;
    if (input.startDate !== undefined) this.props.startDate = input.startDate;
    if (input.endDate !== undefined) this.props.endDate = input.endDate;
    if (input.description !== undefined) this.props.description = input.description;
    if (input.technologies !== undefined) this.props.technologies = input.technologies;
    if (input.location !== undefined) this.props.location = input.location.trim();
    if (input.current !== undefined) this.props.current = input.current;
    if (input.employmentType !== undefined) this.props.employmentType = input.employmentType;
    if (input.level !== undefined) this.props.level = input.level;
    if (input.companyUrl !== undefined) this.props.companyUrl = input.companyUrl;
    if (input.featured !== undefined) this.props.featured = input.featured;
    this.props.updatedAt = new Date();
  }
  toProps(): JobProps {
    return { ...this.props };
  }
}

// LocalizedText re-export convenience (not used)
export { LT as LocalizedTextCtor };

// ---- ContactMessage (contact ingestion, plan-contact-crm.md) ----
export type ContactMessageStatus = 'NEW' | 'READ' | 'REPLIED';

export interface ContactMessageProps {
  id: string;
  email: string;
  subject?: string;
  body: string;
  source?: string;
  locale?: 'en' | 'ru';
  status: ContactMessageStatus;
  createdAt: Date;
  readAt?: Date;
  repliedAt?: Date;
}

export class ContactMessage {
  private props: ContactMessageProps;
  private constructor(props: ContactMessageProps) {
    this.props = props;
  }
  static create(input: {
    id?: string;
    email: string;
    subject?: string;
    body: string;
    source?: string;
    locale?: 'en' | 'ru';
  }): ContactMessage {
    const email = input.email.trim();
    assert(email.length > 0 && email.length <= 254, 'ContactMessage.email invalid');
    const body = input.body.trim();
    assert(body.length >= 1 && body.length <= 2000, 'ContactMessage.body invalid length');
    const subject = input.subject?.trim();
    if (subject) {
      assert(subject.length <= 120, 'ContactMessage.subject too long');
    }
    const source = input.source?.trim();
    if (source) {
      assert(source.length <= 64, 'ContactMessage.source too long');
    }
    const locale = input.locale;
    if (locale) {
      assert(locale === 'en' || locale === 'ru', 'ContactMessage.locale invalid');
    }
    return new ContactMessage({
      id: input.id ?? crypto.randomUUID(),
      email,
      subject: subject || undefined,
      body,
      source: source || undefined,
      locale,
      status: 'NEW',
      createdAt: new Date(),
    });
  }
  static reconstitute(props: ContactMessageProps): ContactMessage {
    return new ContactMessage(props);
  }
  get id() {
    return this.props.id;
  }
  get email() {
    return this.props.email;
  }
  get subject() {
    return this.props.subject;
  }
  get body() {
    return this.props.body;
  }
  get source() {
    return this.props.source;
  }
  get locale() {
    return this.props.locale;
  }
  get status() {
    return this.props.status;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  toProps(): ContactMessageProps {
    return { ...this.props };
  }
  toCreateInput(): ContactMessageProps {
    return this.toProps();
  }
}
