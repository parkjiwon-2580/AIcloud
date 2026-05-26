import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'questionnaire-service' };
  }

  @Get('db-health')
  async dbHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
