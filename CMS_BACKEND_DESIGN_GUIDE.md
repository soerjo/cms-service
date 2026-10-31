# CMS Service - Dokumentasi Endpoint, Alur Kerja & Panduan Penyelarasan Tim Desain

Dokumen ini disusun khusus sebagai jembatan komunikasi antara tim **Backend Engineering** dan **Product / UI-UX Design Team**. Tujuannya agar tim desain memahami kapabilitas arsitektur CMS, format data konten, struktur halaman (Page Blocks), serta bagaimana menyelaraskan desain antarmuka dengan model data headless CMS yang ada di backend.

---

## 1. Arsitektur Inti CMS (Headless & Multi-Site)

Backend CMS dibangun dengan arsitektur **Headless CMS** berbasis **Multi-Site** & **Block-Based Content**:
1. **Multi-Site Capability**: Satu instance backend melayani banyak website/brand via identifier `siteKey` (contoh: `/s/resto-nusantara/delivery/v1/...` atau via header `x-site-key: resto-nusantara`).
2. **Page & Block Engine**: Halaman web bukan statis hardcoded, melainkan tersusun dari array komponen `blocks` (`[{ id, type, props }]`). Desain UI/UX dapat dimodelkan menjadi reusable section components (Hero, Features, Pricing, Testimonials, Form, Gallery, dsb).
3. **Dynamic Content Modeling (JSONB & Singleton/Collection)**: Konten artikel, menu, katalog, maupun setting brand disimpan dalam skema dinamis yang valid dan fleksibel.
4. **Media Asset Hub**: Manajemen upload file/gambar terpusat dengan metadata `altText`, resolusi (`width`/`height`), serta `focalPoint` (untuk auto-cropping di berbagai resolusi layar UI).
5. **Form Submissions**: Endpoint penampung leads/form kontak publik yang fleksibel tanpa perlu ubah tabel database tiap ada input baru.

---

## 2. Standar Response Format API

Semua response REST API CMS dibungkus secara seragam oleh interceptor:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-10-31T16:00:00.000Z",
  "path": "/api/delivery/v1/pages"
}
```

- **Base URL API**: `http://<host>:<port>/api`
- **Swagger Documentation UI**: `http://<host>:<port>/docs`

---

## 3. Daftar Lengkap Endpoint

### A. Delivery API (Public - Konsumsi Frontend / Website Pengunjung)
Endpoint ini bersifat **Publik (No Auth)**, di-cache secara otomatis (`Cache-Control: public, max-age=60, s-maxage=300`), dan digunakan oleh frontend website untuk me-render halaman ke pengunjung.

Dapat diakses dengan 2 mode URL:
- Global: `/api/delivery/v1/...` (mengirim query `?siteKey=...` atau header `x-site-key: ...`, fallback ke `default`)
- Scoped Site: `/api/s/:siteKey/delivery/v1/...`

| Method | Endpoint | Deskripsi | Query / Param Utama |
|---|---|---|---|
| `GET` | `/delivery/v1/pages` | Mengambil daftar seluruh halaman yang sudah di-publish | `siteKey`, `locale` (id/en) |
| `GET` | `/delivery/v1/pages/*route` | Mengambil 1 halaman spesifik berdasarkan route (misal `/`, `/about`, `/menu`) | `route`, `siteKey`, `locale` |
| `GET` | `/delivery/v1/content` | List entries konten publik (artikel, berita, produk) | `siteKey`, `contentType`, `tag`, `slug`, `search`, `page`, `limit` |
| `GET` | `/delivery/v1/content/:slug` | Detail konten artikel/post berdasarkan slug | `slug`, `contentType`, `siteKey`, `locale` |
| `GET` | `/delivery/v1/categories` | Daftar kategori konten | `siteKey` |
| `GET` | `/delivery/v1/tags` | Daftar tagar (tags) konten | `siteKey` |
| `POST`| `/delivery/v1/forms/:formKey/submissions` | Mengirim data form kontak / booking / leads | `formKey` (default `contact`), Body: `{ [key: string]: any }` |
| `POST`| `/delivery/v1/forms/submit` | Alias pengiriman data form | Body: payload JSON bebas |
| `GET` | `/delivery/v1/sitemap.xml` | XML sitemap dinamis untuk SEO | `siteKey` |
| `GET` | `/delivery/v1/robots.txt` | File robots.txt dinamis per site | `siteKey` |

---

### B. CMS Management & Admin API (Protected - Butuh Bearer Token)
Endpoint ini membutuhkan token login JWT UMS (`Authorization: Bearer <token>`). Digunakan oleh Dashboard Admin CMS untuk membuat dan mengatur konten.

#### 1. Site Management (`/api/cms/sites`)
- `GET /api/cms/sites` : List semua site milik user / tenant.
- `POST /api/cms/sites` : Buat website baru (bisa langsung clone dari starter template seperti `resto-web-profile` atau `kult-barbershop-starter-site`).
- `GET /api/cms/sites/:key` : Detail website (nama, domain kustom, status, default locale).
- `PATCH /api/cms/sites/:key` : Update konfigurasi / setting website.
- `DELETE /api/cms/sites/:key` : Nonaktifkan / suspend website.
- `GET /api/cms/sites/:key/pages` : List semua page dalam website (termasuk status Draft / Scheduled / Published).
- `GET /api/cms/sites/:key/media` : Media library milik website tertentu.
- `GET /api/cms/sites/:key/members` : Anggota tim & role akses pengelola website.
- `GET /api/cms/sites/:key/submissions` : Data leads / pesan masuk dari form publik.
- `PATCH /api/cms/sites/:key/submissions/:id` : Update status submission (`PENDING`, `PROCESSED`, `SPAM`, `ARCHIVED`).

#### 2. Page & Block Templates (`/api/cms/sites` & DB Schema)
- Mengatur susunan blok layout halaman, meta SEO (Title, Description, OpenGraph Image), dan status publikasi.

#### 3. Content Types & Entries (`/api/content-types` & `/api/content`)
- `GET /api/content-types` & `POST /api/content-types` : Mendefinisikan skema konten (misal: "Menu Item", "Blog Post", "Testimonial").
- `GET /api/content/entries` & `POST /api/content/entries` : Mengelola record data konten.
- `POST /api/content/entries/:id/publish` : Publikasi langsung atau jadwalkan rilis otomatis di masa depan (`scheduledAt`).
- `POST /api/content/entries/:id/unpublish` : Kembalikan status menjadi DRAFT.
- `POST /api/content/entries/:id/archive` : Arsipkan konten.

#### 4. Media Asset Library (`/api/media`)
- `POST /api/media` : Upload 1 file media (gambar, dokumen).
- `POST /api/media/bulk` : Upload multiple media (maksimal 10 file per batch).
- `GET /api/media` : Daftar media asset dengan pagination.
- `GET /api/media/:id` : Detail aset media.
- `DELETE /api/media/:id` : Hapus aset media.

---

## 4. Alur Kerja & Interaksi (Flow Diagram)

### Flow 1: Rendering Halaman Publik (Frontend Website Visitor)
```text
[ Browser Pengunjung ]
         │
         │  1. Request route halaman (contoh: "/")
         ▼
[ Frontend Next.js / Astro ]
         │
         │  2. GET /api/delivery/v1/pages/
         ▼
[ CMS Service (Delivery Engine) ]
         │
         │  3. Query Page (status=PUBLISHED, locale='id')
         │     Ambil array 'blocks' & SEO metadata
         ▼
[ Frontend Next.js ]
         │
         │  4. Mapping block.type ke Desain Komponen:
         │     - "hero"         --> <HeroBlock {...props} />
         │     - "features"     --> <FeaturesGrid {...props} />
         │     - "testimonials" --> <TestimonialCarousel {...props} />
         │     - "contact-form" --> <ContactForm {...props} />
         ▼
[ Tampilan Website Lengkap & Responsif ]
```

### Flow 2: Pengisian & Pengiriman Form Kontak
```text
[ Pengunjung Isi Form di UI ]
         │
         │  Input: nama, email, nomor HP, pesan
         ▼
[ Frontend Form Handler ]
         │
         │  POST /api/delivery/v1/forms/contact/submissions
         │  Body: { "name": "...", "email": "...", "message": "..." }
         ▼
[ CMS Service ]
         │
         │  1. Validasi & catat IP + User Agent
         │  2. Simpan ke database (status: PENDING)
         ▼
[ Response 200 OK ] ──> Frontend menampilkan notifikasi sukses
         │
         ▼
[ Dashboard Admin CMS ]
Pengelola melihat pesan masuk di:
GET /api/cms/sites/{siteKey}/submissions
```

---

## 5. Panduan Penyelarasan Tim Desain (Design-to-Backend Alignment)

Agar desain UI di Figma / Stitch selaras 100% dan dapat diimplementasikan tanpa hambatan oleh frontend engineer:

### 1. Konsep "Block-Based Design System"
Backend menyimpan konten halaman per section dalam format JSON blok:
```json
{
  "id": "blk-hero-01",
  "type": "hero",
  "props": {
    "headline": "Solusi Digital Terbaik untuk Bisnis Anda",
    "subheadline": "Tingkatkan konversi dengan platform terintegrasi",
    "ctaLabel": "Hubungi Kami",
    "ctaHref": "/contact",
    "backgroundImageUrl": "https://storage.../hero.webp"
  }
}
```
> **Panduan untuk Tim Desain:**
> - Buatlah komponen halaman dalam section-section yang modular di Figma (misal: `Hero`, `FeatureList`, `PricingTable`, `GalleryGrid`, `CTASection`, `FAQAccordion`).
> - Tentukan properti teks, gambar, dan tombol untuk tiap section agar mudah dipetakan menjadi `props` di backend.

### 2. Penanganan Gambar & Media (Focal Point & Responsiveness)
Backend menyimpan data gambar dengan metadata:
- `url`: Direct link CDN/Storage
- `width` & `height`: Dimensi asli
- `altText`: Deskripsi aksesibilitas & SEO
- `focalPoint`: Titik fokus gambar `{ "x": 0.5, "y": 0.5 }` (persentase)
> **Panduan untuk Tim Desain:**
> - Pertimbangkan rasio aspek saat merancang (16:9 untuk Hero, 1:1 untuk Avatar/Card, 4:3 untuk Gallery).
> - Dengan adanya `focalPoint`, tim desain tidak perlu khawatir gambar terpotong salah saat mobile responsive.

### 3. SEO & OpenGraph Card Specs
Setiap halaman backend menyediakan field:
- `metaTitle` (Rekomendasi UI: 50-60 karakter)
- `metaDescription` (Rekomendasi UI: 150-160 karakter)
- `ogImageAssetId` / OpenGraph Image (Rasio standar: **1200 x 630 px**)
- `canonicalUrl` & `robots`

### 4. Status Konten & Halaman
Di dashboard admin, konten dan halaman memiliki status lifecycle:
1. `DRAFT`: Sedang dirancang/ditulis, belum muncul ke publik.
2. `SCHEDULED`: Dijadwalkan otomatis rilis pada tanggal/jam tertentu.
3. `PUBLISHED`: Tayang aktif di website publik.
4. `ARCHIVED`: Diarsipkan/disembunyikan dari publik tanpa dihapus dari database.
> **Panduan untuk Tim Desain:**
> - Mohon siapkan status badge visual di desain dashboard admin untuk ke-4 status di atas (misal: Abu-abu untuk Draft, Biru untuk Scheduled, Hijau untuk Published, Kuning/Merah untuk Archived).

---

## 6. Contoh Payload JSON untuk Developer & Designer Mockup

### Detail Halaman (`GET /delivery/v1/pages/`)
```json
{
  "id": "c7a8e0f1-3b42-4f11-9a72-88220911bcde",
  "route": "/",
  "title": "Beranda Resto Nusantara",
  "isHome": true,
  "locale": "id",
  "metaTitle": "Resto Nusantara - Kuliner Khas Tradisional",
  "metaDescription": "Nikmati hidangan otentik nusantara dengan bahan-bahan pilihan.",
  "blocks": [
    {
      "id": "blk-hero",
      "type": "hero",
      "props": {
        "title": "Cita Rasa Otentik Nusantara",
        "description": "Menyajikan resep warisan leluhur dengan sentuhan modern.",
        "primaryCta": { "label": "Pesan Meja", "href": "/reservasi" },
        "secondaryCta": { "label": "Lihat Menu", "href": "/menu" },
        "image": "https://assets.local/resto-hero.jpg"
      }
    },
    {
      "id": "blk-popular-menu",
      "type": "menu-showcase",
      "props": {
        "heading": "Menu Favorit Pilihan",
        "categoryKey": "makanan-utama",
        "limit": 4
      }
    }
  ]
}
```

---
*Dokumen ini digenerate secara otomatis berdasarkan kode aktual backend `cms-service` (NestJS, Prisma, PostgreSQL).*
