import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

export interface McpServerConfig {
  apiUrl?: string;
  apiKey?: string;
  defaultSiteKey?: string;
}

export function createMcpServer(config?: McpServerConfig): McpServer {
  const apiUrl =
    config?.apiUrl || process.env.CMS_API_URL || 'http://localhost:3000/api';
  const apiKey =
    config?.apiKey || process.env.CMS_MCP_API_KEY || 'mcp-local-dev-key';
  const defaultSiteKey =
    config?.defaultSiteKey || process.env.CMS_DEFAULT_SITE_KEY || 'default';

  const server = new McpServer({
    name: 'cms-mcp-server',
    version: '1.0.0',
  });

  const headers = {
    'Content-Type': 'application/json',
    'x-mcp-api-key': apiKey,
  };

  async function apiGet(path: string): Promise<unknown> {
    const res = await fetch(`${apiUrl}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API GET ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function apiPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API POST ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function apiPatch(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API PATCH ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  // 1. cms_list_content_types (0 args)
  server.tool(
    'cms_list_content_types',
    'Retrieve all content types defined in the CMS backend',
    async () => {
      try {
        const types = await apiGet('/content-types');
        return {
          content: [{ type: 'text', text: JSON.stringify(types, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing content types: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 2. cms_register_content_type
  server.tool(
    'cms_register_content_type',
    'Register a new content type schema in the CMS backend',
    {
      key: z
        .string()
        .describe('Unique content type key (e.g. article, site-identity)'),
      name: z.string().describe('Human-readable display name'),
      description: z.string().optional().describe('Optional description'),
      isSingleton: z
        .boolean()
        .describe(
          'Whether this content type holds a single singleton entry per site',
        ),
      fields: z.array(z.unknown()).describe('Array of field definitions'),
    },
    async (args) => {
      try {
        const result = await apiPost('/content-types', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: 'text',
              text: `Error registering content type: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 3. cms_upsert_singleton
  server.tool(
    'cms_upsert_singleton',
    'Create or update a singleton content entry (e.g. site-identity, hero-section)',
    {
      siteKey: z
        .string()
        .optional()
        .describe('Site key identifier (defaults to CMS_DEFAULT_SITE_KEY)'),
      contentType: z.string().describe('Content type key (e.g. site-identity)'),
      data: z.unknown().describe('Content data object'),
      slug: z.string().optional().describe('Optional slug override'),
      locale: z
        .string()
        .optional()
        .default('id')
        .describe('Locale code (default id)'),
    },
    async (args) => {
      try {
        const site = args.siteKey || defaultSiteKey;
        const entrySlug = args.slug || args.contentType;

        const rawTypes = await apiGet('/content-types');
        const contentTypes = Array.isArray(rawTypes)
          ? (rawTypes as Array<Record<string, unknown>>)
          : [];
        const ct = contentTypes.find((t) => t.key === args.contentType);
        if (!ct || typeof ct.id !== 'string') {
          throw new Error(
            `Content type '${args.contentType}' not found. Please register it first.`,
          );
        }
        const contentTypeId = ct.id;

        let existingId: string | undefined;
        try {
          const deliveryRes = (await apiGet(
            `/delivery/v1/content?siteKey=${encodeURIComponent(
              site,
            )}&contentType=${encodeURIComponent(args.contentType)}`,
          )) as Record<string, unknown>;
          const items = Array.isArray(deliveryRes.items)
            ? (deliveryRes.items as Array<Record<string, unknown>>)
            : Array.isArray(
                  (deliveryRes.data as Record<string, unknown>)?.items,
                )
              ? ((deliveryRes.data as Record<string, unknown>).items as Array<
                  Record<string, unknown>
                >)
              : [];
          if (items.length > 0 && typeof items[0].id === 'string') {
            existingId = items[0].id;
          }
        } catch {
          // ignore delivery fetch error and fall back to create
        }

        let result: unknown;
        if (existingId) {
          result = await apiPatch(`/content/entries/${existingId}`, {
            data: args.data,
          });
        } else {
          const created = (await apiPost('/content/entries', {
            contentTypeId,
            slug: entrySlug,
            data: args.data,
            locale: args.locale,
          })) as Record<string, unknown>;
          if (typeof created.id === 'string') {
            existingId = created.id;
            result = await apiPost(
              `/content/entries/${existingId}/publish`,
              {},
            );
          } else {
            result = created;
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            { type: 'text', text: `Error upserting singleton: ${message}` },
          ],
          isError: true,
        };
      }
    },
  );

  // 4. cms_create_collection_entry
  server.tool(
    'cms_create_collection_entry',
    'Add a new collection entry (article, mading, testimonial, faq, etc.)',
    {
      siteKey: z.string().optional().describe('Site key identifier'),
      contentType: z.string().describe('Content type key'),
      slug: z.string().describe('Unique URL slug for the entry'),
      data: z.unknown().describe('Entry data payload'),
      publishNow: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to publish immediately'),
      locale: z.string().optional().default('id').describe('Locale code'),
    },
    async (args) => {
      try {
        const rawTypes = await apiGet('/content-types');
        const contentTypes = Array.isArray(rawTypes)
          ? (rawTypes as Array<Record<string, unknown>>)
          : [];
        const ct = contentTypes.find((t) => t.key === args.contentType);
        if (!ct || typeof ct.id !== 'string') {
          throw new Error(`Content type '${args.contentType}' not found.`);
        }
        const contentTypeId = ct.id;

        const created = (await apiPost('/content/entries', {
          contentTypeId,
          slug: args.slug,
          data: args.data,
          locale: args.locale,
        })) as Record<string, unknown>;

        let result: unknown = created;
        if (args.publishNow !== false && typeof created.id === 'string') {
          result = await apiPost(`/content/entries/${created.id}/publish`, {});
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: 'text',
              text: `Error creating collection entry: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 5. cms_batch_seed_from_hardcode
  server.tool(
    'cms_batch_seed_from_hardcode',
    'Batch seed content types, singletons, and collection entries from hardcoded web profile data',
    {
      siteKey: z.string().optional().describe('Site key identifier'),
      contentTypes: z
        .array(
          z.object({
            key: z.string(),
            name: z.string(),
            description: z.string().optional(),
            isSingleton: z.boolean(),
            fields: z.array(z.unknown()),
          }),
        )
        .optional()
        .describe('Content types to register'),
      singles: z
        .unknown()
        .optional()
        .describe(
          'Map of contentType key -> data object for singleton entries',
        ),
      collections: z
        .array(
          z.object({
            contentType: z.string(),
            slug: z.string(),
            data: z.unknown(),
            publishNow: z.boolean().optional(),
          }),
        )
        .optional()
        .describe('Array of collection entries'),
    },
    async (args) => {
      try {
        const site = args.siteKey || defaultSiteKey;
        const summary: Record<string, unknown> = {
          registeredContentTypes: [],
          upsertedSingles: [],
          createdCollections: [],
        };

        const regList = Array.isArray(summary.registeredContentTypes)
          ? summary.registeredContentTypes
          : [];
        const singleList = Array.isArray(summary.upsertedSingles)
          ? summary.upsertedSingles
          : [];
        const collectionList = Array.isArray(summary.createdCollections)
          ? summary.createdCollections
          : [];

        if (args.contentTypes) {
          for (const ctDef of args.contentTypes) {
            try {
              const res = await apiPost('/content-types', ctDef);
              regList.push({
                key: ctDef.key,
                status: 'success',
                result: res,
              });
            } catch (e: unknown) {
              const emsg = e instanceof Error ? e.message : String(e);
              regList.push({
                key: ctDef.key,
                status: 'skipped_or_error',
                error: emsg,
              });
            }
          }
        }

        const rawTypes = await apiGet('/content-types');
        const contentTypes = Array.isArray(rawTypes)
          ? (rawTypes as Array<Record<string, unknown>>)
          : [];
        const ctMap = new Map<string, string>();
        for (const t of contentTypes) {
          if (typeof t.key === 'string' && typeof t.id === 'string') {
            ctMap.set(t.key, t.id);
          }
        }

        const singlesObj =
          args.singles && typeof args.singles === 'object'
            ? (args.singles as Record<string, unknown>)
            : undefined;

        if (singlesObj) {
          for (const [contentTypeKey, data] of Object.entries(singlesObj)) {
            const ctId = ctMap.get(contentTypeKey);
            if (!ctId) {
              singleList.push({
                contentType: contentTypeKey,
                status: 'error',
                error: 'Content type not found',
              });
              continue;
            }
            let existingId: string | undefined;
            try {
              const deliveryRes = (await apiGet(
                `/delivery/v1/content?siteKey=${encodeURIComponent(
                  site,
                )}&contentType=${encodeURIComponent(contentTypeKey)}`,
              )) as Record<string, unknown>;
              const items = Array.isArray(deliveryRes.items)
                ? (deliveryRes.items as Array<Record<string, unknown>>)
                : Array.isArray(
                      (deliveryRes.data as Record<string, unknown>)?.items,
                    )
                  ? ((deliveryRes.data as Record<string, unknown>)
                      .items as Array<Record<string, unknown>>)
                  : [];
              if (items.length > 0 && typeof items[0].id === 'string') {
                existingId = items[0].id;
              }
            } catch {
              // ignore
            }

            if (existingId) {
              const res = await apiPatch(`/content/entries/${existingId}`, {
                data,
              });
              singleList.push({
                contentType: contentTypeKey,
                status: 'updated',
                id: existingId,
                result: res,
              });
            } else {
              const created = (await apiPost('/content/entries', {
                contentTypeId: ctId,
                slug: contentTypeKey,
                data,
                locale: 'id',
              })) as Record<string, unknown>;
              if (typeof created.id === 'string') {
                const pub = await apiPost(
                  `/content/entries/${created.id}/publish`,
                  {},
                );
                singleList.push({
                  contentType: contentTypeKey,
                  status: 'created_and_published',
                  id: created.id,
                  result: pub,
                });
              } else {
                singleList.push({
                  contentType: contentTypeKey,
                  status: 'created',
                  result: created,
                });
              }
            }
          }
        }

        if (args.collections) {
          for (const col of args.collections) {
            const ctId = ctMap.get(col.contentType);
            if (!ctId) {
              collectionList.push({
                contentType: col.contentType,
                slug: col.slug,
                status: 'error',
                error: 'Content type not found',
              });
              continue;
            }
            try {
              const created = (await apiPost('/content/entries', {
                contentTypeId: ctId,
                slug: col.slug,
                data: col.data,
                locale: 'id',
              })) as Record<string, unknown>;
              let res: unknown = created;
              if (col.publishNow !== false && typeof created.id === 'string') {
                res = await apiPost(
                  `/content/entries/${created.id}/publish`,
                  {},
                );
              }
              collectionList.push({
                contentType: col.contentType,
                slug: col.slug,
                status: 'success',
                result: res,
              });
            } catch (e: unknown) {
              const emsg = e instanceof Error ? e.message : String(e);
              collectionList.push({
                contentType: col.contentType,
                slug: col.slug,
                status: 'error',
                error: emsg,
              });
            }
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Error in batch seed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

if (
  process.argv[1]?.endsWith('server.ts') ||
  process.argv[1]?.endsWith('server.js')
) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  server.connect(transport).catch((err: unknown) => {
    console.error('MCP Server error:', err);
    process.exit(1);
  });
}
