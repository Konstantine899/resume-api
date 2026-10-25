import type { LocalizedText } from '../domain/localized-text';
import type {
  AboutContentProps,
  ContactContentProps,
  JobProps,
  ProjectProps,
  SkillCategoryProps,
  SkillTechnologyProps,
  TechnologyProps,
} from '../domain/aggregates';

export type AboutUpsertCommand = Partial<Omit<AboutContentProps, 'id' | 'updatedAt'>> & {
  id?: string;
};
export type ContactUpsertCommand = Partial<Omit<ContactContentProps, 'id' | 'updatedAt'>> & {
  id?: string;
};
export type ProjectCreateCommand = Omit<ProjectProps, 'id' | 'updatedAt' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};
export type ProjectUpdateCommand = { id: string } & Partial<
  Omit<ProjectProps, 'id' | 'updatedAt' | 'createdAt'>
>;
export type SkillCategoryUpsertCommand = Omit<SkillCategoryProps, 'id' | 'updatedAt'> & {
  id?: string;
};
export type JobCreateCommand = Omit<JobProps, 'id' | 'updatedAt' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};
export type JobUpdateCommand = { id: string } & Partial<
  Omit<JobProps, 'id' | 'updatedAt' | 'createdAt'>
>;
export type TechnologyUpsertCommand = Omit<TechnologyProps, 'updatedAt'>;

export { type LocalizedText };
export type { SkillTechnologyProps };
