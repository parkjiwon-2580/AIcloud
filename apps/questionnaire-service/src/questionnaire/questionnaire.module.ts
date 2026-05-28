import { Module }
  from '@nestjs/common';

<<<<<<< HEAD
=======
import { OnpremModule } from '../onprem/onprem.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestUserService } from '../request-user.service';
import { SqsService } from '../sqs/sqs.service';
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
import { QuestionnaireController }
  from './questionnaire.controller';

import { QuestionnaireService }
  from './questionnaire.service';

@Module({
<<<<<<< HEAD
=======
  imports: [
    PrismaModule,
    OnpremModule,
  ],
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf

  controllers: [
    QuestionnaireController,
  ],

  providers: [
    QuestionnaireService,
<<<<<<< HEAD
  ],
})
export class QuestionnaireModule {}
=======
    RequestUserService,
    SqsService,
  ],
})
export class QuestionnaireModule {}
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
