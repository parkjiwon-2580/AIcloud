import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, normalize } from 'path';

@Injectable()
export class S3ReportService {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-northeast-2',
  });

  async uploadReport(consultationId: string, pdf: Buffer) {
    const bucket = this.bucketName();
    const key = `${this.reportPrefix()}${consultationId}.pdf`;

    if (this.isLocalMode()) {
      const path = this.localPath(key);
      mkdirSync(dirname(path), {
        recursive: true,
      });
      writeFileSync(path, pdf);
      return {
        bucket,
        key,
      };
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdf,
        ContentType: 'application/pdf',
        ContentDisposition: `attachment; filename="consultation-${consultationId}.pdf"`,
      }),
    );

    return {
      bucket,
      key,
    };
  }

  async createDownloadUrl(key: string) {
    if (this.isLocalMode()) {
      return `${process.env.PUBLIC_AI_BASE_URL ?? 'http://localhost:8084'}/ai/local-report/${encodeURIComponent(key)}`;
    }

    const expiresIn = Number(process.env.S3_PRESIGNED_URL_EXPIRE_SECONDS ?? 300);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName(),
        Key: key,
      }),
      {
        expiresIn: Number.isFinite(expiresIn) ? expiresIn : 300,
      },
    );
  }

  readLocalReport(key: string) {
    if (!this.isLocalMode()) {
      throw new ServiceUnavailableException('Local report storage is not enabled');
    }
    return readFileSync(this.localPath(key));
  }

  isLocalMode() {
    const bucket = process.env.S3_BUCKET_NAME;
    return !bucket || bucket.toLowerCase() === 'local';
  }

  private bucketName() {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket && this.isLocalMode()) {
      return 'local';
    }
    if (!bucket) {
      throw new ServiceUnavailableException('S3_BUCKET_NAME is not configured');
    }
    return bucket;
  }

  private reportPrefix() {
    return (
      process.env.S3_REPORT_PREFIX ??
      process.env.S3_BOARD_IMAGE_PREFIX ??
      'reports/'
    ).replace(/^\/+/, '');
  }

  private localPath(key: string) {
    const root = process.env.LOCAL_REPORT_DIR ?? join(process.cwd(), 'local-reports');
    const path = normalize(join(root, key));
    const normalizedRoot = normalize(root);
    if (!path.startsWith(normalizedRoot)) {
      throw new ServiceUnavailableException('Invalid report key');
    }
    return path;
  }
}
