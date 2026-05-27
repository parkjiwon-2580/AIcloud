import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'questionnaire-service' };
  }

  @Get('db-health')
  dbHealth() {
    return { status: 'skipped', reason: 'Prisma is disabled on the practice branch' };
  }
}
