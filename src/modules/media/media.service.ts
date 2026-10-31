import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaRepository } from './media.repository.js';
import { HttpFileServiceTokenProvider } from './file-service.client.js';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private repo: MediaRepository,
    private tokenProvider: HttpFileServiceTokenProvider,
    private configService: ConfigService,
  ) {}

  async upload(file: Express.Multer.File, uploadedById: string) {
    if (file.mimetype.startsWith('video/')) {
      throw new BadRequestException(
        'Direct video uploads are not supported to prevent server overload. Please host your video on YouTube or Vimeo and embed the link or iframe instead.',
      );
    }

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid mime type: ${file.mimetype}`);
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 25MB limit');
    }

    const fileServiceUrl = this.configService.get<string>('FILE_SERVICE_URL');
    const uploadEndpoint = `${fileServiceUrl?.replace(/\/$/, '')}/files/upload`;

    const formData = new FormData();
    const blob = new Blob([file.buffer as unknown as ArrayBuffer], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname);

    const response = await this.tokenProvider.fetchWithAuth(uploadEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new BadRequestException(
        `Failed to upload file to file service: ${errText}`,
      );
    }

    const json = (await response.json()) as Record<string, unknown>;
    const fileDto = (json['data'] as Record<string, unknown>) || json;

    const fileId = fileDto['id'] as string;
    const objectKey = fileDto['objectKey'] as string;
    const originalName =
      (fileDto['originalName'] as string) || file.originalname;
    const mimeType = (fileDto['mimeType'] as string) || file.mimetype;
    const sizeBytes = (fileDto['size'] as number) || file.size;

    const created = await this.repo.create({
      fileId,
      objectKey,
      originalName,
      mimeType,
      sizeBytes,
      uploadedById,
    });

    const url =
      (await this.fetchPresignedUrl(fileId)) ??
      `/api/delivery/v1/media/${encodeURIComponent(objectKey)}`;
    return { ...created, url };
  }

  async uploadMultiple(files: Express.Multer.File[], uploadedById: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return Promise.all(files.map((file) => this.upload(file, uploadedById)));
  }

  async findAll(skip?: number, take?: number) {
    const items = await this.repo.findAll(skip, take);
    return Promise.all(
      items.map(async (item) => {
        const url = await this.fetchPresignedUrl(item.fileId);
        return { ...item, url };
      }),
    );
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    const url = await this.fetchPresignedUrl(item.fileId);
    return { ...item, url };
  }

  async delete(id: string) {
    const asset = await this.repo.findById(id);
    const fileServiceUrl = this.configService.get<string>('FILE_SERVICE_URL');
    const deleteEndpoint = `${fileServiceUrl?.replace(/\/$/, '')}/files/${asset.fileId}`;

    try {
      const response = await this.tokenProvider.fetchWithAuth(deleteEndpoint, {
        method: 'DELETE',
      });
      if (response.status !== 404 && !response.ok) {
        this.logger.warn(
          `Failed to delete file upstream: status ${response.status}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Error deleting file upstream: ${err}`);
    }

    return this.repo.delete(id);
  }

  async getPresignedUrlByObjectKey(objectKey: string): Promise<string | null> {
    const asset = await this.repo.findByObjectKey(objectKey);
    if (!asset) {
      return null;
    }
    return this.fetchPresignedUrl(asset.fileId);
  }

  private async fetchPresignedUrl(fileId: string): Promise<string | null> {
    const fileServiceUrl = this.configService.get<string>('FILE_SERVICE_URL');
    const urlEndpoint = `${fileServiceUrl?.replace(/\/$/, '')}/files/${fileId}/url`;

    try {
      const response = await this.tokenProvider.fetchWithAuth(urlEndpoint, {
        method: 'GET',
      });
      if (!response.ok) {
        return null;
      }
      const json = (await response.json()) as Record<string, unknown>;
      const dataObj = json['data'] as Record<string, unknown>;
      return (
        (dataObj?.['url'] as string) ||
        (json['url'] as string) ||
        (typeof json['data'] === 'string' ? json['data'] : null)
      );
    } catch {
      return null; // fail-soft
    }
  }
}
