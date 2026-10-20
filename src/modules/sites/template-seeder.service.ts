import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PageStatus, type Prisma } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface StarterTemplatePage {
  route: string;
  title: string;
  isHome?: boolean;
  status?: string;
  blocks: Record<string, unknown>[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface StarterTemplate {
  industry: string;
  templateKey: string;
  name: string;
  description: string;
  defaultLocale?: string;
  pages: StarterTemplatePage[];
}

@Injectable()
export class TemplateSeederService {
  private readonly logger = new Logger(TemplateSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  private loadTemplate(templateKey: string): StarterTemplate | null {
    const searchPaths = [
      `/shared/platform-docs/docs/cms/starter-templates/${templateKey}.json`,
      resolve(
        process.cwd(),
        `../platform-docs/docs/cms/starter-templates/${templateKey}.json`,
      ),
      resolve(process.cwd(), `docs/cms/starter-templates/${templateKey}.json`),
    ];

    for (const path of searchPaths) {
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          return JSON.parse(content) as StarterTemplate;
        } catch (err) {
          this.logger.warn(
            `Failed to parse template at ${path}: ${(err as Error).message}`,
          );
        }
      }
    }

    return this.getEmbeddedFallbackTemplate(templateKey);
  }

  private getEmbeddedFallbackTemplate(
    templateKey: string,
  ): StarterTemplate | null {
    if (templateKey === 'resto-web-profile') {
      return {
        industry: 'restaurant',
        templateKey: 'resto-web-profile',
        name: 'Resto & Cafe Web Profile',
        description: 'Starter template for restaurants and cafes',
        pages: [
          {
            route: '/',
            title: 'Beranda',
            isHome: true,
            status: 'PUBLISHED',
            blocks: [
              {
                id: 'blk-hero-1',
                type: 'hero',
                props: {
                  headline: 'Cita Rasa Nusantara yang Otentik',
                  ctaLabel: 'Lihat Menu',
                },
              },
            ],
          },
          {
            route: '/about',
            title: 'Tentang Kami',
            isHome: false,
            status: 'PUBLISHED',
            blocks: [
              {
                id: 'blk-about-1',
                type: 'text-block',
                props: { content: 'Cerita kami...' },
              },
            ],
          },
        ],
      };
    }

    if (templateKey === 'toko-retail-profile') {
      return {
        industry: 'retail',
        templateKey: 'toko-retail-profile',
        name: 'Toko Retail & Produk',
        description: 'Starter template for retail shops and stores',
        pages: [
          {
            route: '/',
            title: 'Beranda Toko',
            isHome: true,
            status: 'PUBLISHED',
            blocks: [
              {
                id: 'blk-hero-1',
                type: 'hero',
                props: { headline: 'Katalog Produk Pilihan' },
              },
            ],
          },
        ],
      };
    }

    if (templateKey === 'jasa-service-profile') {
      return {
        industry: 'services',
        templateKey: 'jasa-service-profile',
        name: 'Profil Usaha Jasa & Layanan',
        description: 'Starter template for service businesses',
        pages: [
          {
            route: '/',
            title: 'Beranda Layanan',
            isHome: true,
            status: 'PUBLISHED',
            blocks: [
              {
                id: 'blk-hero-1',
                type: 'hero',
                props: { headline: 'Solusi Profesional Terbaik' },
              },
            ],
          },
        ],
      };
    }

    if (templateKey === 'kult-barbershop-profile') {
      return {
        industry: 'barbershop',
        templateKey: 'kult-barbershop-profile',
        name: 'KULT Barber & Atelier',
        description:
          'Template profil atelier barbering premium dengan menu ritual cukur presisi, kurasi pengalaman atelier bento, studio sanctuary Senopati, dan form reservasi.',
        defaultLocale: 'id',
        pages: [
          {
            route: '/',
            title: 'KULT Barber & Atelier — Senopati Sanctuary',
            isHome: true,
            status: 'PUBLISHED',
            metaTitle:
              'KULT Barber & Atelier | Precision Cuts & Elevated Grooming Senopati',
            metaDescription:
              'Heritage barbering meets contemporary atelier precision. Exclusive sanctuary in Senopati, South Jakarta.',
            blocks: [
              {
                id: 'blk-hero-kult',
                type: 'hero-atelier',
                props: {
                  badge: 'Redefining Precision Haircuts & Grooming in Senopati',
                  headline: 'Precision Cuts. Modern Craft.',
                  subheadline: 'Elevated Grooming.',
                  description:
                    'Welcome to KULT Barber & Atelier, where heritage barbering meets contemporary atelier precision. Experience uncompromising styling in an exclusive sanctuary designed for the modern gentleman.',
                },
              },
            ],
          },
          {
            route: '/services',
            title: 'Services & Pricing — KULT Barber & Atelier',
            isHome: false,
            status: 'PUBLISHED',
            metaTitle: 'Services & Signature Rituals | KULT Barber & Atelier',
            metaDescription:
              'Explore our curated menu of haircut rituals, beard grooming, hot towel treatments, and hair spa.',
            blocks: [
              {
                id: 'blk-services-kult',
                type: 'service-menu',
                props: {
                  headline: 'Curated Services & Pricing',
                  subheadline: 'Tailored Hair & Beard Artistry',
                },
              },
            ],
          },
          {
            route: '/contact',
            title: 'Reservations & Sanctuary Location — KULT Barber & Atelier',
            isHome: false,
            status: 'PUBLISHED',
            metaTitle: 'Book Your Atelier Experience | KULT Barber & Atelier',
            metaDescription:
              'Visit our sanctuary at Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan. Walk-ins welcome based on artisan availability.',
            blocks: [
              {
                id: 'blk-contact-kult',
                type: 'contact-sanctuary',
                props: {
                  headline: 'Reserve Your Seat & Visit Us',
                  address:
                    'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan 12190',
                  phone: '+62 811-9876-5432',
                  hours: 'Daily: 10:00 - 21:00 WIB',
                },
              },
            ],
          },
        ],
      };
    }

    return null;
  }

  async seedTemplate(
    siteId: string,
    templateKey: string,
    createdById: string = 'system',
  ) {
    const template = this.loadTemplate(templateKey);
    if (!template) {
      this.logger.warn(
        `Starter template '${templateKey}' not found. Skipping seeding.`,
      );
      return;
    }

    this.logger.log(
      `Seeding template '${templateKey}' for site '${siteId}' (${template.pages.length} pages)`,
    );

    for (const pageDef of template.pages) {
      const pageStatus =
        pageDef.status === 'PUBLISHED'
          ? PageStatus.PUBLISHED
          : PageStatus.DRAFT;

      const page = await this.prisma.page.create({
        data: {
          siteId,
          route: pageDef.route,
          title: pageDef.title,
          isHome: Boolean(pageDef.isHome),
          status: pageStatus,
          blocks: pageDef.blocks as unknown as Prisma.InputJsonValue,
          locale: template.defaultLocale || 'id',
          createdById,
          publishedAt: pageStatus === PageStatus.PUBLISHED ? new Date() : null,
          metaTitle: pageDef.metaTitle || pageDef.title,
          metaDescription: pageDef.metaDescription,
        },
      });

      // Create initial page revision
      await this.prisma.pageRevision.create({
        data: {
          pageId: page.id,
          version: 1,
          title: page.title,
          blocks: pageDef.blocks as unknown as Prisma.InputJsonValue,
          createdById,
        },
      });
    }

    this.logger.log(
      `Successfully seeded template '${templateKey}' for site '${siteId}'`,
    );
  }
}
