import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Pool, type PoolClient, type PoolConfig } from 'pg';
import { readEnv, readNumberEnv, requireEnv } from '../config';
import { RequestUserService } from '../request-user.service';
import { BoardImageUploadDto, BoardPostDto } from './dto/board.dto';

interface BoardImageRecord {
  id: string;
  postId: string;
  s3Key: string;
  createdAt: Date;
  url?: string;
}

interface BoardPostRecord {
  id: string;
  userId: string;
  category: string;
  targetAgeMonths: string;
  title: string;
  content: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  images: BoardImageRecord[];
  admin: {
    nickname: string;
    role: string;
  };
  user: {
    nickname: string;
    role: string;
  };
}

@Injectable()
export class BoardService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly s3 = new S3Client({
    region: readEnv('AWS_REGION', 'ap-northeast-2'),
  });

  constructor(private readonly requestUser: RequestUserService) {
    this.pool = new Pool(this.databaseConfig());
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async list(targetAgeMonths?: string) {
    const target = targetAgeMonths?.trim();
    const result = await this.pool.query(
      `
        SELECT
          p.id,
          p.admin_id,
          p.category,
          p.target_age_months,
          p.title,
          p.content,
          p.view_count,
          p.created_at,
          p.updated_at,
          u.nickname AS admin_nickname,
          u.role AS admin_role,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'postId', i.post_id,
                's3Key', i.s3_key,
                'createdAt', i.created_at
              )
              ORDER BY i.created_at
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
          ) AS images
        FROM ai_care.board_posts p
        LEFT JOIN ai_care.users u ON u.id = p.admin_id
        LEFT JOIN ai_care.board_images i ON i.post_id = p.id
        WHERE ($1::text IS NULL OR $1 = '전체' OR p.target_age_months = $1 OR p.target_age_months = '전체')
        GROUP BY p.id, u.nickname, u.role
        ORDER BY p.created_at DESC
      `,
      [target || null],
    );
    return Promise.all(result.rows.map((row) => this.toPostRecord(row)));
  }

  async detail(id: string) {
    const result = await this.pool.query(
      `
        WITH updated AS (
          UPDATE ai_care.board_posts
          SET view_count = view_count + 1,
              updated_at = now()
          WHERE id = $1
          RETURNING *
        )
        SELECT
          p.id,
          p.admin_id,
          p.category,
          p.target_age_months,
          p.title,
          p.content,
          p.view_count,
          p.created_at,
          p.updated_at,
          u.nickname AS admin_nickname,
          u.role AS admin_role,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'postId', i.post_id,
                's3Key', i.s3_key,
                'createdAt', i.created_at
              )
              ORDER BY i.created_at
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
          ) AS images
        FROM updated p
        LEFT JOIN ai_care.users u ON u.id = p.admin_id
        LEFT JOIN ai_care.board_images i ON i.post_id = p.id
        GROUP BY
          p.id,
          p.admin_id,
          p.category,
          p.target_age_months,
          p.title,
          p.content,
          p.view_count,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.role
      `,
      [id],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Post not found');
    }
    return this.toPostRecord(result.rows[0]);
  }

  async create(dto: BoardPostDto, authorization?: string) {
    const admin = this.requestUser.requireAdmin(authorization);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `
          INSERT INTO ai_care.board_posts (admin_id, category, target_age_months, title, content)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [admin.id, dto.category, dto.targetAgeMonths, dto.title, dto.content],
      );
      const postId = created.rows[0].id as string;
      await this.replaceImages(client, postId, dto.imageS3Keys ?? []);
      const post = await this.findPostById(client, postId);
      await client.query('COMMIT');
      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: BoardPostDto, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `
          UPDATE ai_care.board_posts
          SET category = $2,
              target_age_months = $3,
              title = $4,
              content = $5,
              updated_at = now()
          WHERE id = $1
          RETURNING id
        `,
        [id, dto.category, dto.targetAgeMonths, dto.title, dto.content],
      );
      if (!updated.rows[0]) {
        throw new NotFoundException('Post not found');
      }
      if (dto.imageS3Keys) {
        await this.replaceImages(client, id, dto.imageS3Keys);
      }
      const post = await this.findPostById(client, id);
      await client.query('COMMIT');
      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id: string, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM ai_care.board_images WHERE post_id = $1', [id]);
      const deleted = await client.query('DELETE FROM ai_care.board_posts WHERE id = $1 RETURNING id', [id]);
      if (!deleted.rows[0]) {
        throw new NotFoundException('Post not found');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { id, status: 'deleted' };
  }

  async createImageUploadUrl(dto: BoardImageUploadDto, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    if (!dto.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    const bucket = this.s3Bucket();
    const key = `${this.boardImagePrefix()}${new Date().toISOString().slice(0, 10)}/${randomUUID()}${this.safeImageExtension(dto.filename)}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.contentType,
    });
    const expiresIn = readNumberEnv('S3_PRESIGNED_URL_EXPIRE_SECONDS', 300);

    return {
      bucket,
      key,
      uploadUrl: await getSignedUrl(this.s3, command, { expiresIn }),
      expiresIn,
    };
  }

  private async replaceImages(client: PoolClient, postId: string, imageS3Keys: string[]) {
    await client.query('DELETE FROM ai_care.board_images WHERE post_id = $1', [postId]);
    for (const s3Key of imageS3Keys.filter(Boolean)) {
      await client.query('INSERT INTO ai_care.board_images (post_id, s3_key) VALUES ($1, $2)', [postId, s3Key]);
    }
  }

  private async findPostById(client: Pool | PoolClient, id: string): Promise<BoardPostRecord> {
    const result = await client.query(
      `
        SELECT
          p.id,
          p.admin_id,
          p.category,
          p.target_age_months,
          p.title,
          p.content,
          p.view_count,
          p.created_at,
          p.updated_at,
          u.nickname AS admin_nickname,
          u.role AS admin_role,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'postId', i.post_id,
                's3Key', i.s3_key,
                'createdAt', i.created_at
              )
              ORDER BY i.created_at
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
          ) AS images
        FROM ai_care.board_posts p
        LEFT JOIN ai_care.users u ON u.id = p.admin_id
        LEFT JOIN ai_care.board_images i ON i.post_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, u.nickname, u.role
      `,
      [id],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Post not found');
    }
    return this.toPostRecord(result.rows[0]);
  }

  private async toPostRecord(row: {
    id: string;
    admin_id: string;
    category: string;
    target_age_months: string;
    title: string;
    content: string;
    view_count: number | string;
    created_at: Date;
    updated_at: Date;
    admin_nickname?: string;
    admin_role?: string;
    images?: BoardImageRecord[];
  }): Promise<BoardPostRecord> {
    const admin = {
      nickname: row.admin_nickname ?? '관리자',
      role: row.admin_role ?? 'ADMIN',
    };
    const images = await Promise.all(
      (row.images ?? []).map(async (image) => ({
        ...image,
        url: await this.createImageDownloadUrl(image.s3Key),
      })),
    );
    return {
      id: row.id,
      userId: row.admin_id,
      category: row.category,
      targetAgeMonths: row.target_age_months,
      title: row.title,
      content: row.content,
      viewCount: Number(row.view_count ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      images,
      admin,
      user: admin,
    };
  }

  private databaseConfig(): PoolConfig {
    const ssl = this.databaseSslConfig();
    const connectionString = this.kubernetesSafeDatabaseUrl();
    if (connectionString) {
      return { connectionString, ssl };
    }

    const password = readEnv('RDS_PASSWORD');
    if (!password) {
      throw new Error('RDS_PASSWORD is required');
    }

    return {
      host: requireEnv('RDS_HOST'),
      port: readNumberEnv('RDS_PORT', 5432),
      database: requireEnv('RDS_DB_NAME'),
      user: requireEnv('RDS_USERNAME'),
      password,
      ssl,
    };
  }

  private async createImageDownloadUrl(key: string) {
    if (!key) return '';
    const command = new GetObjectCommand({
      Bucket: this.s3Bucket(),
      Key: key,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: readNumberEnv('S3_PRESIGNED_URL_EXPIRE_SECONDS', 300),
    });
  }

  private s3Bucket() {
    const bucket = readEnv('S3_BUCKET_NAME');
    if (!bucket) {
      throw new ServiceUnavailableException('S3_BUCKET_NAME is not configured');
    }
    return bucket;
  }

  private boardImagePrefix() {
    return readEnv('S3_BOARD_IMAGE_PREFIX', 'board-images/').replace(/^\/+/, '').replace(/\/?$/, '/');
  }

  private safeImageExtension(filename: string) {
    const extension = extname(filename).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension) ? extension : '';
  }

  private kubernetesSafeDatabaseUrl(): string {
    const connectionString = readEnv('DATABASE_URL');
    if (!connectionString || !process.env.KUBERNETES_SERVICE_HOST) {
      return connectionString;
    }

    try {
      const host = new URL(connectionString).hostname.toLowerCase();
      if (['localhost', '127.0.0.1', 'host.docker.internal'].includes(host)) {
        return '';
      }
    } catch {
      return connectionString;
    }

    return connectionString;
  }

  private databaseSslConfig(): PoolConfig['ssl'] {
    const enabled = readEnv('RDS_SSL', 'false').toLowerCase();
    if (!['true', '1', 'require'].includes(enabled)) {
      return false;
    }
    return {
      rejectUnauthorized: readEnv('RDS_SSL_REJECT_UNAUTHORIZED', 'false').toLowerCase() === 'true',
    };
  }
}
