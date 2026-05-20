import { Module } from '@nestjs/common';

import { QuestionnaireModule }
  from './questionnaire/questionnaire.module';

@Module({
  imports: [
    QuestionnaireModule,
  ],
})
export class AppModule {}