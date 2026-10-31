import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpServer } from './server.js';

describe('MCP Server', () => {
  let client: Client;
  let server: McpServer;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    server = createMcpServer({
      apiUrl: 'http://localhost:3000/api',
      apiKey: 'test-api-key',
    });
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    jest.restoreAllMocks();
  });

  it('lists tools successfully', async () => {
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(5);
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('cms_list_content_types');
    expect(names).toContain('cms_register_content_type');
    expect(names).toContain('cms_upsert_singleton');
    expect(names).toContain('cms_create_collection_entry');
    expect(names).toContain('cms_batch_seed_from_hardcode');
  });

  describe('cms_list_content_types', () => {
    it('fetches and returns content types', async () => {
      const mockTypes = [{ id: '1', key: 'article', name: 'Article' }];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTypes),
      });

      const result = (await client.callTool({
        name: 'cms_list_content_types',
        arguments: {},
      })) as { content: Array<{ type: string; text: string }> };

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/content-types',
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            'x-mcp-api-key': 'test-api-key',
          }),
        }),
      );
      const data = JSON.parse(result.content[0].text) as unknown as Array<
        Record<string, unknown>
      >;
      expect(data).toEqual(mockTypes);
    });

    it('handles api error gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const result = (await client.callTool({
        name: 'cms_list_content_types',
        arguments: {},
      })) as { isError?: boolean; content: Array<{ text: string }> };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing content types');
    });
  });

  describe('cms_register_content_type', () => {
    it('registers a new content type', async () => {
      const payload = {
        key: 'hero-section',
        name: 'Hero Section',
        isSingleton: true,
        fields: [{ name: 'title', type: 'text' }],
      };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'ct-1', ...payload }),
      });

      const result = (await client.callTool({
        name: 'cms_register_content_type',
        arguments: payload,
      })) as { content: Array<{ text: string }> };

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/content-types',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      );
      const parsed = JSON.parse(result.content[0].text) as unknown as Record<
        string,
        unknown
      >;
      expect(parsed.id).toBe('ct-1');
    });
  });

  describe('cms_upsert_singleton', () => {
    it('updates existing singleton entry via PATCH when it exists', async () => {
      // 1. list content types
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'ct-site', key: 'site-identity', isSingleton: true },
          ]),
      });
      // 2. check delivery existing
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'entry-123' }] }),
      });
      // 3. patch entry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: 'entry-123', data: { title: 'New' } }),
      });

      const result = (await client.callTool({
        name: 'cms_upsert_singleton',
        arguments: {
          siteKey: 'kult-barber',
          contentType: 'site-identity',
          data: { title: 'New' },
        },
      })) as { content: Array<{ text: string }> };

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        'http://localhost:3000/api/content/entries/entry-123',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
      const parsed = JSON.parse(result.content[0].text) as unknown as Record<
        string,
        unknown
      >;
      expect(parsed.id).toBe('entry-123');
    });

    it('creates and publishes singleton when not existing', async () => {
      // 1. list content types
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'ct-site', key: 'site-identity', isSingleton: true },
          ]),
      });
      // 2. check delivery existing (empty)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });
      // 3. create entry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: 'entry-new', data: { title: 'New' } }),
      });
      // 4. publish entry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'entry-new',
            status: 'PUBLISHED',
            data: { title: 'New' },
          }),
      });

      const result = (await client.callTool({
        name: 'cms_upsert_singleton',
        arguments: {
          contentType: 'site-identity',
          data: { title: 'New' },
        },
      })) as { content: Array<{ text: string }> };

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        'http://localhost:3000/api/content/entries/entry-new/publish',
        expect.objectContaining({
          method: 'POST',
        }),
      );
      const parsed = JSON.parse(result.content[0].text) as unknown as Record<
        string,
        unknown
      >;
      expect(parsed.status).toBe('PUBLISHED');
    });
  });

  describe('cms_create_collection_entry', () => {
    it('creates and publishes collection entry', async () => {
      // 1. list content types
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'ct-art', key: 'article', isSingleton: false },
          ]),
      });
      // 2. create entry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'entry-art', slug: 'my-article' }),
      });
      // 3. publish entry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'entry-art', status: 'PUBLISHED' }),
      });

      const result = (await client.callTool({
        name: 'cms_create_collection_entry',
        arguments: {
          contentType: 'article',
          slug: 'my-article',
          data: { title: 'Hello' },
          publishNow: true,
        },
      })) as { content: Array<{ text: string }> };

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const parsed = JSON.parse(result.content[0].text) as unknown as Record<
        string,
        unknown
      >;
      expect(parsed.status).toBe('PUBLISHED');
    });
  });

  describe('cms_batch_seed_from_hardcode', () => {
    it('seeds content types, singletons, and collections in batch', async () => {
      // 1. register content type
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'ct-art', key: 'article' }),
      });
      // 2. list content types after registration
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'ct-art', key: 'article', isSingleton: false },
          ]),
      });
      // 3. delivery check for singleton (if any) or create collection
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'entry-c1', status: 'PUBLISHED' }),
      });
      // 4. publish collection
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'entry-c1', status: 'PUBLISHED' }),
      });

      const result = (await client.callTool({
        name: 'cms_batch_seed_from_hardcode',
        arguments: {
          siteKey: 'default',
          contentTypes: [
            {
              key: 'article',
              name: 'Article',
              isSingleton: false,
              fields: [],
            },
          ],
          collections: [
            {
              contentType: 'article',
              slug: 'test-slug',
              data: { title: 'Test' },
              publishNow: true,
            },
          ],
        },
      })) as { content: Array<{ text: string }> };

      const summary = JSON.parse(result.content[0].text) as unknown as Record<
        string,
        unknown
      >;
      const createdCollections = Array.isArray(summary.createdCollections)
        ? (summary.createdCollections as Array<Record<string, unknown>>)
        : [];
      const registeredContentTypes = Array.isArray(
        summary.registeredContentTypes,
      )
        ? (summary.registeredContentTypes as Array<Record<string, unknown>>)
        : [];

      expect(registeredContentTypes).toHaveLength(1);
      expect(createdCollections).toHaveLength(1);
      expect(createdCollections[0].status).toBe('success');
    });
  });
});
