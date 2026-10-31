import {
  validateContentData,
  sanitizeAndValidateContentData,
  FieldDefinition,
} from './content-validation.util.js';

describe('validateContentData', () => {
  const fields: FieldDefinition[] = [
    { key: 'title', type: 'text', label: 'Title', required: true },
    { key: 'count', type: 'number', label: 'Count', required: false },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      options: ['active', 'inactive'],
    },
    {
      key: 'body',
      type: 'rich_text',
      label: 'Content Body',
      required: false,
    },
  ];

  it('should pass valid data', () => {
    const data = { title: 'Hello', count: 5, status: 'active' };
    expect(() => validateContentData(fields, data)).not.toThrow();
  });

  it('should sanitize rich_text data by stripping dangerous scripts and keeping safe HTML', () => {
    const dirtyHtml =
      '<h1>Judul Artikel</h1><p>Paragraf <b>tebal</b></p><script>alert("XSS")</script><img src="x" onerror="alert(1)" />';
    const sanitized = sanitizeAndValidateContentData(fields, {
      title: 'Hello',
      status: 'active',
      body: dirtyHtml,
    });

    expect(sanitized.body).toContain('<h1>Judul Artikel</h1>');
    expect(sanitized.body).toContain('<p>Paragraf <b>tebal</b></p>');
    expect(sanitized.body).not.toContain('<script>');
    expect(sanitized.body).not.toContain('alert("XSS")');
    expect(sanitized.body).not.toContain('onerror');
  });

  it('should throw if required field is missing', () => {
    const data = { count: 5, status: 'active' };
    expect(() => validateContentData(fields, data)).toThrow(/Title.*required/);
  });

  it('should throw if number field is not a number', () => {
    const data = { title: 'Hello', count: 'not-a-number', status: 'active' };
    expect(() => validateContentData(fields, data)).toThrow(/Count.*number/);
  });

  it('should throw if select value is not in options', () => {
    const data = { title: 'Hello', status: 'invalid-option' };
    expect(() => validateContentData(fields, data)).toThrow(
      /not in allowed options/,
    );
  });
});
