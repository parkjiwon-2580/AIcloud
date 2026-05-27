import { Module } from '@nestjs/common';

<<<<<<< HEAD
import { QuestionnaireModule }
  from './questionnaire/questionnaire.module';

@Module({
  imports: [
    QuestionnaireModule,
  ],
})
export class AppModule {}
=======
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
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
