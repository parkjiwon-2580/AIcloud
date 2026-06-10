import { Module } from '@nestjs/common';

import { QuestionnaireModule }
  from './questionnaire/questionnaire.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    QuestionnaireModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
