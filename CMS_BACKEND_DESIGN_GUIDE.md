# CMS Service - Dokumentasi API & Panduan Integrasi Frontend (Rena)

Dokumen ini disusun sebagai panduan integrasi antara **Backend (`cms-service`)** dan **Frontend Web Profile (`Rena / Next.js / Tailwind`)**.

Sesuai arah arsitektur tim, website profil dirancang dan di-coding langsung oleh tim frontend. Backend CMS berperan murni sebagai **Headless Content Provider & Asset Hub** (tidak lagi memuat Page Block Builder).

---

## 1. Arsitektur & Peran CMS

1. **Multi-Site Provider**: Satu backend melayani berbagai web profile via `siteKey` (contoh: `kult-barber`, `resto-nusantara`, `jasa-demo`).
2. **Identitas & Section (Single Types / Singleton)**: Data konten statis tunggal seperti Identitas Brand, Hero Banner, Jam Buka, Kontak, dan Footer.
3. **Koleksi Dinamis (Collection Types)**: Data list seperti Artikel Berita/Blog, Testimoni Klien, Portofolio, atau Menu/Produk.
4. **Media Hub**: Upload foto banner, avatar, logo dengan resolusi dan focal-point terpusat.
5. **Form Submissions**: Menampung pesan dari formulir kontak / RSVP / leads pengunjung web.

---

## 2. Base URL & Standar Response

- **Base URL API:** `http://<host>:3000/api`
- **Swagger UI:** `http://<host>:3000/docs`

Format response API seragam:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-10-31T17:00:00.000Z",
  "path": "/api/delivery/v1/content"
}
```

---

## 3. Delivery API untuk Frontend (Publik / No Auth)

Endpoint ini di-cache otomatis dan dikonsumsi langsung oleh kode frontend Rena:

| Method | Endpoint | Deskripsi & Parameter |
|---|---|---|
| `GET` | `/delivery/v1/content` | Mengambil list entri konten publik.<br>**Query:** `siteKey`, `contentType` (misal: `article`, `testimonial`, `site-identity`), `slug`, `tag`, `search`, `page`, `limit`. |
| `GET` | `/delivery/v1/content/:slug` | Mengambil detail entri berdasarkan slug URL.<br>**Query:** `siteKey`, `contentType`, `locale` (default: `id`). |
| `GET` | `/delivery/v1/categories` | Mengambil daftar kategori konten (`siteKey`). |
| `GET` | `/delivery/v1/tags` | Mengambil daftar tagar (`siteKey`). |
| `POST`| `/delivery/v1/forms/:formKey/submissions` | Mengirim data form kontak/leads dari pengunjung.<br>**Body:** Payload JSON bebas (`{ name, email, phone, message }`). |
| `GET` | `/delivery/v1/sitemap.xml` | XML sitemap otomatis untuk SEO (`siteKey`). |
| `GET` | `/delivery/v1/robots.txt` | File robots.txt dinamis per site. |

> **Catatan Multi-Site:**  
> Selain melalui query `?siteKey=my-site`, frontend juga bisa memanggil route scoped `/api/s/:siteKey/delivery/v1/...` atau mengirimkan HTTP Header `x-site-key: my-site`.

---

## 4. Pola Konsumsi Data di Frontend (Next.js)

### A. Mengambil Identitas Web & Banner Hero (Singleton)
Frontend cukup memanggil `GET /api/delivery/v1/content?contentType=site-identity&siteKey=kult-barber`:
```typescript
// Contoh di Server Component Next.js
export async function getSiteIdentity(siteKey: string) {
  const res = await fetch(`http://cms-service/api/delivery/v1/content?contentType=site-identity&siteKey=${siteKey}`, {
    next: { revalidate: 300 } // cache 5 menit
  });
  const json = await res.json();
  return json.data.items[0]?.data; 
  // Output: { brandName: "KULT Barber", contactEmail: "info@kult.id", address: "...", ... }
}
```

### B. Mengambil Daftar Artikel Blog / Berita
```typescript
export async function getBlogArticles(siteKey: string, page = 1) {
  const res = await fetch(`http://cms-service/api/delivery/v1/content?contentType=article&siteKey=${siteKey}&page=${page}&limit=6`);
  const json = await res.json();
  return {
    articles: json.data.items,
    pagination: json.data.meta
  };
}
```

### C. Mengambil Detail Artikel Berdasarkan Slug
```typescript
export async function getArticleBySlug(slug: string, siteKey: string) {
  const res = await fetch(`http://cms-service/api/delivery/v1/content/${slug}?contentType=article&siteKey=${siteKey}`);
  const json = await res.json();
  return json.data; // { id, slug, data: { title, content, coverImage }, ... }
}
```

### D. Mengirim Form Kontak
```typescript
export async function submitContactForm(siteKey: string, payload: { name: string; email: string; message: string }) {
  const res = await fetch(`http://cms-service/api/delivery/v1/forms/contact/submissions?siteKey=${siteKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
```

---

## 5. Default Content Types yang Tersedia

1. **`article` (Koleksi Artikel Blog)**:
   - Field: `title` (text), `slug` (text), `excerpt` (text), `content` (rich_text), `coverImage` (media), `readingTime` (number).
2. **`site-identity` (Profil Situs - Singleton)**:
   - Field: `brandName` (text), `tagline` (text), `logoImage` (media), `contactEmail` (text), `contactPhone` (text), `address` (text).
3. **`testimonial` (Testimoni Pelanggan)**:
   - Field: `clientName` (text), `clientRole` (text), `avatar` (media), `rating` (number), `quote` (text).
