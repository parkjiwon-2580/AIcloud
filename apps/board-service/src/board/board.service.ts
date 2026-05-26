import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUserService } from '../request-user.service';
import { BoardPostDto } from './dto/board.dto';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestUser: RequestUserService,
  ) {}

  list(q?: string) {
    return this.prisma.boardPost.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { images: true, user: { select: { nickname: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(id: string) {
    const post = await this.prisma.boardPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { images: true, user: { select: { nickname: true, role: true } } },
    }).catch(() => null);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async create(dto: BoardPostDto, authorization?: string) {
    const admin = this.requestUser.requireAdmin(authorization);
    return this.prisma.boardPost.create({
      data: {
        id: randomUUID(),
        userId: admin.id,
        title: dto.title,
        content: dto.content,
        images: {
          create: (dto.imageS3Keys ?? []).map((s3Key) => ({ id: randomUUID(), s3Key })),
        },
      },
      include: { images: true },
    });
  }

  async update(id: string, dto: BoardPostDto, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    return this.prisma.boardPost.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
    });
  }

  async remove(id: string, authorization?: string) {
    this.requestUser.requireAdmin(authorization);
    await this.prisma.boardPost.delete({ where: { id } });
    return { id, status: 'deleted' };
  }
}
