import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
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

    await this.sqs.send(

      new SendMessageCommand({

        QueueUrl:
          queueUrl,

        MessageBody:
          JSON.stringify(messageBody),
      }),
    );

    return { published: true, mode: 'sqs', messageBody };
  }
}
