import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { MediaReferences } from '../domain/ports';

/** Documents that may point at a media key (plan WU-2/D8). */
@Injectable()
export class PrismaMediaReferences implements MediaReferences {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async isReferenced(key: string): Promise<boolean> {
    const [about, project, technology] = await Promise.all([
      this.prisma.aboutContent.findFirst({ where: { portrait: key }, select: { id: true } }),
      this.prisma.project.findFirst({ where: { image: key }, select: { id: true } }),
      this.prisma.technology.findFirst({ where: { url: key }, select: { key: true } }),
    ]);
    return Boolean(about ?? project ?? technology);
  }
}
