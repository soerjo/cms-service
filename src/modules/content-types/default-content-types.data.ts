import type { CreateContentTypeDto } from './dto/create-content-type.dto.js';

export const DEFAULT_CONTENT_TYPES: readonly CreateContentTypeDto[] = [
  {
    key: 'site-identity',
    name: 'Identitas & Profil Situs',
    description: 'Pengaturan global identitas website, kontak, dan logo',
    isSingleton: true,
    fields: [
      {
        key: 'brandName',
        type: 'text',
        label: 'Nama Brand / Bisnis',
        required: true,
      },
      {
        key: 'tagline',
        type: 'text',
        label: 'Tagline / Slogan',
        required: false,
      },
      {
        key: 'logoImage',
        type: 'media',
        label: 'Logo Utama',
        required: false,
      },
      {
        key: 'contactEmail',
        type: 'text',
        label: 'Email Publik',
        required: true,
      },
      {
        key: 'contactPhone',
        type: 'text',
        label: 'Nomor WhatsApp / Telepon',
        required: false,
      },
      {
        key: 'address',
        type: 'text',
        label: 'Alamat Fisik',
        required: false,
      },
      {
        key: 'socialLinks',
        type: 'text',
        label: 'Tautan Media Sosial',
        required: false,
      },
    ],
  },
  {
    key: 'hero-section',
    name: 'Hero & Banner Utama',
    description: 'Section banner utama halaman beranda',
    isSingleton: true,
    fields: [
      {
        key: 'headline',
        type: 'text',
        label: 'Headline Utama',
        required: true,
      },
      {
        key: 'subheadline',
        type: 'text',
        label: 'Subheadline / Deskripsi Singkat',
        required: false,
      },
      {
        key: 'ctaLabel',
        type: 'text',
        label: 'Teks Tombol CTA',
        required: false,
      },
      {
        key: 'ctaLink',
        type: 'text',
        label: 'Tautan Tombol CTA',
        required: false,
      },
      {
        key: 'bannerImage',
        type: 'media',
        label: 'Gambar Banner',
        required: false,
      },
    ],
  },
  {
    key: 'article',
    name: 'Artikel & Blog',
    description: 'Koleksi artikel berita, tips, dan update blog',
    isSingleton: false,
    fields: [
      {
        key: 'title',
        type: 'text',
        label: 'Judul Artikel',
        required: true,
      },
      { key: 'slug', type: 'text', label: 'URL Slug', required: true },
      {
        key: 'excerpt',
        type: 'text',
        label: 'Ringkasan Singkat',
        required: false,
      },
      {
        key: 'content',
        type: 'rich_text',
        label: 'Isi Konten Lengkap',
        required: true,
      },
      {
        key: 'coverImage',
        type: 'media',
        label: 'Foto Utama (Cover)',
        required: false,
      },
      {
        key: 'readingTime',
        type: 'number',
        label: 'Estimasi Waktu Baca (Menit)',
        required: false,
      },
    ],
  },
  {
    key: 'testimonial',
    name: 'Testimonial Pelanggan',
    description: 'Koleksi ulasan dan testimoni pelanggan',
    isSingleton: false,
    fields: [
      {
        key: 'clientName',
        type: 'text',
        label: 'Nama Klien / Pelanggan',
        required: true,
      },
      {
        key: 'clientRole',
        type: 'text',
        label: 'Profesi / Perusahaan',
        required: false,
      },
      {
        key: 'avatar',
        type: 'media',
        label: 'Foto Avatar',
        required: false,
      },
      {
        key: 'rating',
        type: 'number',
        label: 'Bintang Rating (1-5)',
        required: true,
      },
      {
        key: 'quote',
        type: 'text',
        label: 'Kutipan Ulasan',
        required: true,
      },
    ],
  },
  {
    key: 'faq',
    name: 'FAQ (Pertanyaan Umum)',
    description: 'Koleksi tanya jawab umum untuk pengunjung web',
    isSingleton: false,
    fields: [
      { key: 'question', type: 'text', label: 'Pertanyaan', required: true },
      { key: 'answer', type: 'text', label: 'Jawaban', required: true },
      {
        key: 'order',
        type: 'number',
        label: 'Urutan Tampil',
        required: false,
      },
    ],
  },
];
