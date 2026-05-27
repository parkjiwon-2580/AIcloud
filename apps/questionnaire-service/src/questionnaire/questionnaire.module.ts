import { Module }
  from '@nestjs/common';

import { OnpremModule } from '../onprem/onprem.module';
import { RequestUserService } from '../request-user.service';
import { SqsService } from '../sqs/sqs.service';
import { QuestionnaireController }
  from './questionnaire.controller';

import { QuestionnaireService }
  from './questionnaire.service';

@Module({
  imports: [
    OnpremModule,
  ],

  controllers: [
    QuestionnaireController,
  ],

  providers: [
    QuestionnaireService,
    RequestUserService,
    SqsService,
  ],
})
export class QuestionnaireModule {}
