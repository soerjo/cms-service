# Panduan Lengkap Integrasi Frontend (Rena / Next.js) - CMS Service

Dokumen ini disusun sebagai panduan teknis resmi bagi tim Frontend (**Rena / Next.js**) dalam mengonsumsi data dari **`cms-service`**.

Website profil di-coding dan di-styling sepenuhnya oleh tim Frontend menggunakan Next.js / Tailwind CSS / Shadcn UI. Backend CMS berfungsi sebagai **Headless Content Provider & Asset Hub**.

---

## 1. Konsep Dasar & Arsitektur Data

### A. Dua Jenis Model Konten
Backend CMS menyimpan seluruh data konten di tabel `content_entries` menggunakan kolom fleksibel `data (JSONB)` yang dibedakan menjadi dua jenis model:

1. **Singleton (Single Type / Data Tunggal):**
   - **Konsep:** Komponen atau bagian website yang **hanya ada 1 record per website**.
   - **Contoh:** Profil Brand / Kontak (`site-identity`), Hero Banner Slider (`hero-section`), Pengaturan Footer (`footer-settings`).
   - **Karakteristik Data:** Record tunggal. Di dalamnya bisa berisi data sederhana maupun data array berulang (seperti daftar slide banner yang berisi tombol CTA).
   - **Cara Konsumsi:** Mengambil entri pertama (`items[0]`).

2. **Collection (Multi-entry / Koleksi Dinamis):**
   - **Konsep:** Data berulang yang **bertambah terus jumlahnya, memiliki slug URL masing-masing, dan membutuhkan pagination**.
   - **Contoh:** Artikel Blog (`article`), Pengumuman / Mading (`mading`), Testimoni Pelanggan (`testimonial`), FAQ (`faq`).
   - **Karakteristik Data:** Setiap item baru = 1 baris row baru di database.
   - **Cara Konsumsi:** Menggunakan query pagination `page`, `limit`, filter `search`, atau ambil detail per `slug`.

---

## 2. Base URL & Header Standar

- **Base URL Development:** `http://100.92.245.124:3000/api` (atau host container lokal Mas Soerjo)
- **Swagger API Docs:** `http://100.92.245.124:3000/docs`
- **Delivery API:** Bersifat **Publik (No Auth)**, di-cache otomatis di server (`Cache-Control: public, max-age=60, s-maxage=300`).

### Identifikasi Multi-Site (`siteKey`):
Setiap request ke Delivery API harus menyertakan identifier site. Rena bisa memilih salah satu dari 3 cara berikut:
1. **Query Param (Paling Umum):** `?siteKey=kult-barber`
2. **HTTP Header:** `x-site-key: kult-barber`
3. **Prefix Route:** `/api/s/kult-barber/delivery/v1/...`

---

## 3. Format Response Standar

Semua response REST API CMS dibungkus secara konsisten oleh response interceptor:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-10-31T20:00:00.000Z",
  "path": "/api/delivery/v1/content"
}
```

---

## 4. Daftar Lengkap Endpoint & Contoh Payload

### A. Singleton 1: Identitas & Profil Situs (`site-identity`)
Digunakan untuk mengisi teks Brand, Logo, Alamat, Nomor WhatsApp, dan Email di Navbar & Footer web profil.

- **Method & URL:** `GET /api/delivery/v1/content?contentType=site-identity&siteKey=kult-barber`
- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "e0eff434-458e-4fa4-80ba-af66745ac2f5",
        "slug": "identity",
        "locale": "id",
        "status": "PUBLISHED",
        "data": {
          "brandName": "KULT Barber & Atelier",
          "tagline": "Gentlemen Grooming & Modern Hair Culture",
          "logoImage": "https://storage.local/kult/logo.svg",
          "contactEmail": "halo@kultbarber.id",
          "contactPhone": "6281234567890",
          "address": "Jl. Senopati No. 45, Jakarta Selatan",
          "socialLinks": "https://instagram.com/kultbarber,https://tiktok.com/@kultbarber"
        },
        "publishedAt": "2026-10-31T18:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### B. Singleton 2: Hero Banner Slider dengan Tombol CTA (`hero-section`)
Digunakan untuk komponen Hero Carousel paling atas di halaman beranda. Memiliki array background slide dan tombol CTA (*Call to Action*).

- **Method & URL:** `GET /api/delivery/v1/content?contentType=hero-section&siteKey=kult-barber`
- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "fe5521a0-12bc-41de-84a1-098711abcdef",
        "slug": "hero-home",
        "status": "PUBLISHED",
        "data": {
          "autoplay": true,
          "intervalSeconds": 5,
          "slides": [
            {
              "id": "slide-1",
              "title": "Koleksi Potongan Musim Panas 2026",
              "subtitle": "Tampil segar dengan signature fade cut khas KULT",
              "imageUrl": "https://storage.local/kult/hero-slide-1.webp",
              "cta": {
                "label": "Lihat Lookbook",
                "url": "/lookbook",
                "isExternal": false
              }
            },
            {
              "id": "slide-2",
              "title": "Diskon 20% Khusus Member Baru",
              "subtitle": "Klaim voucher pangkas rambut pertama kamu sekarang",
              "imageUrl": "https://storage.local/kult/hero-slide-2.webp",
              "cta": {
                "label": "Klaim Promo via WhatsApp",
                "url": "https://wa.me/6281234567890?text=Halo%20mau%20klaim%20diskon",
                "isExternal": true
              }
            }
          ]
        }
      }
    ]
  }
}
```

---

### C. Collection: Artikel Blog / Berita (`article`) atau Mading (`mading`)
Digunakan untuk halaman list artikel/berita dengan fitur pagination dan pencarian.

#### 1. Mengambil Daftar Artikel (List dengan Pagination)
- **Method & URL:** `GET /api/delivery/v1/content?contentType=article&siteKey=kult-barber&page=1&limit=6&search=fade`
- **Query Parameters:**
  - `siteKey` (string, required): Key website.
  - `contentType` (string, required): `article` atau `mading`.
  - `page` (number, optional, default: 1): Nomor halaman.
  - `limit` (number, optional, default: 10): Jumlah data per halaman.
  - `search` (string, optional): Cari kata kunci di judul atau isi.
  - `tag` (string, optional): Filter berdasarkan ID atau slug tag.

- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "3c02fa9b-98f1-4db8-b570-5c68b73f8489",
        "slug": "tren-rambut-pria-2026",
        "status": "PUBLISHED",
        "locale": "id",
        "publishedAt": "2026-10-31T12:00:00.000Z",
        "data": {
          "title": "Tren Gaya Rambut Pria Terbaik Tahun 2026",
          "excerpt": "Ulasan lengkap gaya rambut mulai dari classic taper hingga textured crop.",
          "coverImage": "https://storage.local/kult/blog-cover-1.webp",
          "readingTime": 4
        },
        "tags": [
          { "tag": { "id": "t-1", "name": "Grooming", "key": "grooming" } }
        ]
      }
    ],
    "meta": {
      "total": 24,
      "page": 1,
      "limit": 6,
      "totalPages": 4
    }
  }
}
```

#### 2. Mengambil Detail Artikel Berdasarkan Slug
Saat pengunjung membuka halaman `https://kultbarber.id/blog/tren-rambut-pria-2026`:
- **Method & URL:** `GET /api/delivery/v1/content/tren-rambut-pria-2026?contentType=article&siteKey=kult-barber`
- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "3c02fa9b-98f1-4db8-b570-5c68b73f8489",
    "slug": "tren-rambut-pria-2026",
    "status": "PUBLISHED",
    "locale": "id",
    "publishedAt": "2026-10-31T12:00:00.000Z",
    "data": {
      "title": "Tren Gaya Rambut Pria Terbaik Tahun 2026",
      "excerpt": "Ulasan lengkap gaya rambut...",
      "content": "<h2>1. Textured Crop</h2><p>Gaya rambut ini sangat cocok untuk...</p>",
      "coverImage": "https://storage.local/kult/blog-cover-1.webp",
      "readingTime": 4
    },
    "tags": [
      { "tag": { "key": "grooming", "name": "Grooming" } }
    ]
  }
}
```

---

### D. Collection: Testimonial Pelanggan (`testimonial`)
Digunakan untuk section review / ulasan pelanggan.

- **Method & URL:** `GET /api/delivery/v1/content?contentType=testimonial&siteKey=kult-barber&limit=4`
- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "4d11ca72-91e8-4665-8b33-e7f0174a81b2",
        "slug": "testi-aditya-pratama",
        "data": {
          "clientName": "Aditya Pratama",
          "clientRole": "Founder, Tech Start-up",
          "avatar": "https://storage.local/kult/avatar-1.webp",
          "rating": 5,
          "quote": "Pelayanan barber terbaik di Jakarta. Detail pangkas rambutnya sangat presisi dan tempatnya nyaman."
        }
      }
    ]
  }
}
```

---

### E. Collection: FAQ (Tanya Jawab) (`faq`)
Digunakan untuk accordion Tanya Jawab di bagian bawah halaman web.

- **Method & URL:** `GET /api/delivery/v1/content?contentType=faq&siteKey=kult-barber`
- **Contoh Response JSON:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "9a01bb12-34ef-4c12-98aa-1234567890ab",
        "slug": "faq-apakah-perlu-reservasi",
        "data": {
          "question": "Apakah saya harus reservasi terlebih dahulu?",
          "answer": "Kami menerima walk-in, namun sangat menyarankan reservasi online agar tidak perlu mengantre.",
          "order": 1
        }
      }
    ]
  }
}
```

---

### F. Submit Form Kontak / Reservasi Pengunjung (`form_submissions`)
Digunakan saat pengunjung menekan tombol kirim di formulir web.

- **Method & URL:** `POST /api/delivery/v1/forms/:formKey/submissions?siteKey=kult-barber`
  - Contoh `:formKey` = `contact` atau `booking` atau `rsvp`.
- **Request Headers:** `Content-Type: application/json`
- **Request Body (Bebas / Dynamic JSON):**
```json
{
  "name": "Budi Santoso",
  "phone": "08123456789",
  "email": "budi@gmail.com",
  "service": "Signature Haircut & Beard Trim",
  "preferredDate": "2026-11-02 14:00",
  "notes": "Tolong kapsternya yang biasa handle taper fade"
}
```
- **Response Sukses (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "success": true,
    "submissionId": "8a719c82-38b4-4e20-8041-38120bcdf312",
    "message": "Form submitted successfully"
  }
}
```

---

## 5. Contoh Implementasi Kode di Next.js (TypeScript)

Berikut contoh fungsi data-fetching yang siap di-copy-paste ke project Next.js Rena:

```typescript
// lib/cms.ts
const CMS_API_URL = process.env.NEXT_PUBLIC_CMS_API_URL || 'http://100.92.245.124:3000/api';
const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY || 'kult-barber';

// 1. Ambil Identitas Web (Singleton)
export async function getSiteIdentity() {
  const res = await fetch(`${CMS_API_URL}/delivery/v1/content?contentType=site-identity&siteKey=${SITE_KEY}`, {
    next: { revalidate: 300 } // Cache ISR 5 menit
  });
  const json = await res.json();
  return json.data?.items[0]?.data || null;
}

// 2. Ambil Hero Slider (Singleton dengan Tombol CTA)
export async function getHeroSlider() {
  const res = await fetch(`${CMS_API_URL}/delivery/v1/content?contentType=hero-section&siteKey=${SITE_KEY}`, {
    next: { revalidate: 300 }
  });
  const json = await res.json();
  return json.data?.items[0]?.data || null;
}

// 3. Ambil Daftar Artikel (Collection dengan Pagination)
export async function getArticles(page = 1, limit = 6) {
  const res = await fetch(`${CMS_API_URL}/delivery/v1/content?contentType=article&siteKey=${SITE_KEY}&page=${page}&limit=${limit}`, {
    next: { revalidate: 60 }
  });
  const json = await res.json();
  return {
    articles: json.data?.items || [],
    meta: json.data?.meta
  };
}

// 4. Ambil Detail Artikel Berdasarkan Slug
export async function getArticleBySlug(slug: string) {
  const res = await fetch(`${CMS_API_URL}/delivery/v1/content/${slug}?contentType=article&siteKey=${SITE_KEY}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

// 5. Submit Form Publik
export async function submitContact(formKey: string, payload: Record<string, unknown>) {
  const res = await fetch(`${CMS_API_URL}/delivery/v1/forms/${formKey}/submissions?siteKey=${SITE_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
```

---

## 6. Contoh Render Komponen Hero Slider di Next.js

Contoh bagaimana Rena me-render slider dan tombol CTA:

```tsx
// components/HeroSlider.tsx
import Link from 'next/link';

interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  cta?: {
    label: string;
    url: string;
    isExternal?: boolean;
  };
}

export function HeroSlider({ slides }: { slides: Slide[] }) {
  if (!slides || slides.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Menggunakan Slider / Carousel (Embla / Swiper) */}
      {slides.map((slide) => (
        <div key={slide.id} className="relative min-h-[500px] flex items-center justify-center">
          {/* Background Image */}
          <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />

          {/* Teks Konten */}
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl font-bold mb-2">{slide.title}</h1>
            {slide.subtitle && <p className="text-lg mb-6">{slide.subtitle}</p>}

            {/* Tombol CTA (Redirect Internal vs External) */}
            {slide.cta && (
              <a
                href={slide.cta.url}
                target={slide.cta.isExternal ? '_blank' : '_self'}
                rel={slide.cta.isExternal ? 'noopener noreferrer' : undefined}
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
              >
                {slide.cta.label}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---
*Dokumen ini diperbarui secara resmi untuk integrasi `cms-service` (Mona) dengan `frontend-web` (Rena).*
