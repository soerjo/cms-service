import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

export interface FieldDefinition {
  key: string;
  type:
    | 'text'
    | 'rich_text'
    | 'number'
    | 'boolean'
    | 'date'
    | 'media'
    | 'reference'
    | 'select'
    | 'multi_select';
  label: string;
  required?: boolean;
  options?: string[];
}

export const SANITIZE_RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'p',
    'a',
    'ul',
    'ol',
    'nl',
    'li',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'code',
    'hr',
    'br',
    'div',
    'table',
    'thead',
    'caption',
    'tbody',
    'tr',
    'th',
    'td',
    'pre',
    'img',
    'figure',
    'figcaption',
    'span',
    'sub',
    'sup',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
    '*': ['class', 'id'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, SANITIZE_RICH_TEXT_OPTIONS);
}

export function sanitizeAndValidateContentData(
  fields: FieldDefinition[],
  data: Prisma.JsonValue,
): Record<string, Prisma.JsonValue> {
  if (!fields || !Array.isArray(fields)) {
    return (
      data && typeof data === 'object' && !Array.isArray(data)
        ? { ...data }
        : {}
    ) as Record<string, Prisma.JsonValue>;
  }

  const payloadData = (
    data && typeof data === 'object' && !Array.isArray(data) ? { ...data } : {}
  ) as Record<string, Prisma.JsonValue>;

  for (const field of fields) {
    const val = payloadData[field.key];
    const isMissing = val === undefined || val === null || val === '';

    if (field.required && isMissing) {
      throw new BadRequestException(
        `Field '${field.label}' (${field.key}) is required`,
      );
    }

    if (isMissing) {
      continue;
    }

    switch (field.type) {
      case 'rich_text':
        if (typeof val !== 'string') {
          throw new BadRequestException(
            `Field '${field.label}' must be a string`,
          );
        }
        payloadData[field.key] = sanitizeRichText(val);
        break;
      case 'text':
      case 'media':
      case 'reference':
      case 'select':
        if (typeof val !== 'string') {
          throw new BadRequestException(
            `Field '${field.label}' must be a string`,
          );
        }
        if (
          field.type === 'select' &&
          field.options &&
          !field.options.includes(val)
        ) {
          throw new BadRequestException(
            `Field '${field.label}' value '${val}' is not in allowed options: ${field.options.join(', ')}`,
          );
        }
        break;
      case 'number':
        if (typeof val !== 'number' || Number.isNaN(val)) {
          throw new BadRequestException(
            `Field '${field.label}' must be a number`,
          );
        }
        break;
      case 'boolean':
        if (typeof val !== 'boolean') {
          throw new BadRequestException(
            `Field '${field.label}' must be a boolean`,
          );
        }
        break;
      case 'date':
        if (typeof val !== 'string' || isNaN(Date.parse(val))) {
          throw new BadRequestException(
            `Field '${field.label}' must be a valid date string`,
          );
        }
        break;
      case 'multi_select':
        if (!Array.isArray(val)) {
          throw new BadRequestException(
            `Field '${field.label}' must be an array`,
          );
        }
        if (field.options) {
          for (const item of val) {
            if (typeof item !== 'string' || !field.options.includes(item)) {
              throw new BadRequestException(
                `Field '${field.label}' item '${typeof item === 'string' || typeof item === 'number' ? item : JSON.stringify(item)}' is not in allowed options: ${field.options.join(', ')}`,
              );
            }
          }
        }
        break;
    }
  }

  return payloadData;
}

export function validateContentData(
  fields: FieldDefinition[],
  data: Prisma.JsonValue,
) {
  sanitizeAndValidateContentData(fields, data);
}
