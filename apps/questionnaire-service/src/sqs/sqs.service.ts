import {
  Injectable,
<<<<<<< HEAD
=======
  Logger,
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
} from '@nestjs/common';

import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
<<<<<<< HEAD

  private sqs = new SQSClient({
    region: process.env.AWS_REGION,
  });

  async sendQuestionnaireMessage(
    questionnaireId: number,
    childId: number,
  ) {
=======
  private readonly logger = new Logger(SqsService.name);

  private sqs = new SQSClient({
    region: process.env.AWS_REGION ?? 'ap-northeast-2',
  });

  async sendQuestionnaireMessage(
    input: {
      consultationId: string;
      userId: string;
      createdAt: Date;
    },
  ) {
    const queueUrl = process.env.SQS_TRIAGE_QUEUE_URL;
    const messageBody = {
      consultation_id: input.consultationId,
      user_id: input.userId,
      created_at: input.createdAt.toISOString(),
    };

    if (!queueUrl) {
      this.logger.log(`SQS_TRIAGE_QUEUE_URL is empty; mock event=${JSON.stringify(messageBody)}`);
      return { published: false, mode: 'mock', messageBody };
    }
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf

    await this.sqs.send(

      new SendMessageCommand({

        QueueUrl:
<<<<<<< HEAD
          process.env.SQS_URL,

        MessageBody:
          JSON.stringify({
            questionnaireId,
            childId,
          }),
      }),
    );
  }
}
=======
          queueUrl,

        MessageBody:
          JSON.stringify(messageBody),
      }),
    );

    return { published: true, mode: 'sqs', messageBody };
  }
}
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
