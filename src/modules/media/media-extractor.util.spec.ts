import { describe, it, expect } from 'bun:test';
import { extractMediaReferences } from './media-extractor.util.js';

describe('extractMediaReferences', () => {
  it('extracts media URLs from markdown image syntax', () => {
    const payload = {
      title: 'Judul Artikel',
      body: 'Ini paragraf awal.\n\n![Gambar Resto](http://file-service:3100/api/files/resto-banner.webp)\n\nPenutup.',
    };

    const refs = extractMediaReferences(payload);
    expect(refs).toContain('resto-banner.webp');
  });

  it('extracts media from nested blocks and fileId fields', () => {
    const payload = {
      hero: {
        headline: 'Selamat Datang',
        image: { fileId: 'f-hero-123', url: '/files/f-hero-123/url' },
      },
      gallery: [
        { fileId: 'f-gal-1' },
        { url: 'https://cdn.soerjo.local/uploads/event-2026.png' },
      ],
    };

    const refs = extractMediaReferences(payload);
    expect(refs).toContain('f-hero-123');
    expect(refs).toContain('f-gal-1');
    expect(refs).toContain('event-2026.png');
  });

  it('returns empty array if no media references found', () => {
    const payload = { text: 'Hanya teks biasa tanpa gambar' };
    const refs = extractMediaReferences(payload);
    expect(refs).toEqual([]);
  });
});
