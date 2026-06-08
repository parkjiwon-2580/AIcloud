import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestUserService } from '../request-user.service';
import { BoardPostDto } from './dto/board.dto';

interface BoardImageRecord {
  id: string;
  postId: string;
  s3Key: string;
  createdAt: Date;
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
export class BoardService {
  private readonly posts = new Map<string, BoardPostRecord>();

  constructor(private readonly requestUser: RequestUserService) {}

  list(targetAgeMonths?: string) {
    const target = targetAgeMonths?.trim();
    return [...this.posts.values()]
      .filter((post) => !target || target === '전체' || post.targetAgeMonths === target || post.targetAgeMonths === '전체')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async detail(id: string) {
    const post = this.posts.get(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    post.viewCount += 1;
    post.updatedAt = new Date();
    return post;
  }

  async create(dto: BoardPostDto, authorization?: string) {
    const admin = this.requestUser.requireAdmin(authorization);
    const id = randomUUID();
    const now = new Date();
    const post: BoardPostRecord = {
      id,
      userId: admin.id,
      category: dto.category,
      targetAgeMonths: dto.targetAgeMonths,
      title: dto.title,
      content: dto.content,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      images: (dto.imageS3Keys ?? []).map((s3Key) => ({
        id: randomUUID(),
        postId: id,
        s3Key,
        createdAt: now,
      })),
      admin: {
        nickname: 'admin',
        role: admin.role,
      },
      user: {
        nickname: 'admin',
        role: admin.role,
      },
    };
    this.posts.set(id, post);
    return post;
  }

  async update(id: string, dto: BoardPostDto, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    const post = this.posts.get(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    post.category = dto.category;
    post.targetAgeMonths = dto.targetAgeMonths;
    post.title = dto.title;
    post.content = dto.content;
    post.updatedAt = new Date();
    return post;
  }

  async remove(id: string, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    this.posts.delete(id);
    return { id, status: 'deleted' };
  }
}
