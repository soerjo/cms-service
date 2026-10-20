/**
 * Utility to recursively extract all media identifiers (objectKeys, fileIds, or filenames)
 * from content payload JSON (including markdown image tags, URLs, and block definitions).
 */
export function extractMediaReferences(payload: unknown): string[] {
  const references = new Set<string>();

  function traverse(node: unknown) {
    if (!node) return;

    if (typeof node === 'string') {
      // 1. Markdown images: ![alt](url)
      const mdRegex = /!\[.*?\]\((.*?)\)/g;
      let match: RegExpExecArray | null;
      while ((match = mdRegex.exec(node)) !== null) {
        extractFromUrl(match[1]);
      }

      // 2. Direct URLs or paths
      if (
        node.includes('/files/') ||
        node.includes('/uploads/') ||
        node.includes('/media/')
      ) {
        extractFromUrl(node);
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        traverse(item);
      }
      return;
    }

    if (typeof node === 'object') {
      for (const [key, val] of Object.entries(
        node as Record<string, unknown>,
      )) {
        if (key === 'fileId' || key === 'mediaId' || key === 'objectKey') {
          if (typeof val === 'string' && val.trim()) {
            references.add(val.trim());
          }
        }
        traverse(val);
      }
    }
  }

  function extractFromUrl(url: string) {
    try {
      // e.g. http://minio.../files/12345/url or /files/abc-uuid or filename.webp
      const clean = url.split('?')[0].split('#')[0];
      const segments = clean.split('/');
      const last = segments[segments.length - 1];
      const secondLast =
        segments.length > 1 ? segments[segments.length - 2] : null;

      if (last && last !== 'url') {
        references.add(last);
      } else if (last === 'url' && secondLast) {
        references.add(secondLast);
      }
    } catch {
      // ignore parsing errors
    }
  }

  traverse(payload);
  return Array.from(references);
}
