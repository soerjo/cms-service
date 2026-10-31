# Model Context Protocol (MCP) Server for CMS

Panduan ini menjelaskan cara mengonfigurasi dan menggunakan **CMS MCP Server** bagi tim frontend (Rena) untuk mendaftarkan schema (Content Types), melakukan *upsert* data singleton (seperti identitas web & hero section), menambahkan entri koleksi (artikel, testimoni, FAQ), serta melakukan *batch seed* data hardcode dari web profile secara instan melalui AI agent (Hermes Agent / Claude Desktop / Cursor).

---

## 1. Konfigurasi Environment Variables

Pastikan environment berikut dikonfigurasi pada file `.env` root proyek CMS backend:

```env
CMS_API_URL=http://localhost:3000/api
CMS_MCP_API_KEY=mcp-local-dev-key
CMS_DEFAULT_SITE_KEY=default
```

---

## 2. Cara Menjalankan MCP Server

MCP server berjalan menggunakan komunikasi `stdio` (Standard Input/Output) yang kompatibel dengan Claude Desktop, Cursor, dan Hermes Agent.

Script npm/bun yang disediakan di `package.json`:
```bash
bun run mcp
```

---

## 3. Daftar Tools yang Tersedia

1. **`cms_list_content_types`**
   - Mengambil daftar seluruh Content Types yang terdaftar di backend CMS.
2. **`cms_register_content_type`**
   - Mendaftarkan Content Type baru (`key`, `name`, `description`, `isSingleton`, `fields`).
3. **`cms_upsert_singleton`**
   - Membuat atau memperbarui data singleton (`site-identity`, `hero-section`, dll) untuk `siteKey` tertentu, dan otomatis mempublikasikannya.
4. **`cms_create_collection_entry`**
   - Menambahkan entri koleksi dinamis (`article`, `mading`, `testimonial`, `faq`) beserta opsi publikasi instan.
5. **`cms_batch_seed_from_hardcode`**
   - Melakukan ingest seluruh schema, singleton, dan collection entries web profile hardcode dalam satu aksi panggilan.

---

## 4. Konfigurasi Client MCP

### A. Claude Desktop (`claude_desktop_config.json`)
Tambahkan konfigurasi berikut pada file konfigurasi Claude Desktop Anda (misalnya di macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cms-backend": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/opt/data/cms-service",
      "env": {
        "CMS_API_URL": "http://localhost:3000/api",
        "CMS_MCP_API_KEY": "mcp-local-dev-key"
      }
    }
  }
}
```

### B. Cursor / Hermes Agent
Tambahkan konfigurasi MCP server lokal pada pengaturan workspace Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cms-backend": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/opt/data/cms-service",
      "env": {
        "CMS_API_URL": "http://localhost:3000/api",
        "CMS_MCP_API_KEY": "mcp-local-dev-key"
      }
    }
  }
}
```
