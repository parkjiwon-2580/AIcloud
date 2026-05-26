import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { QuestionnaireModule }
  from './questionnaire/questionnaire.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    QuestionnaireModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
