import {
  Injectable,
} from '@nestjs/common';

import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {

  private sqs = new SQSClient({
    region: process.env.AWS_REGION,
  });

  async sendQuestionnaireMessage(
    questionnaireId: number,
    childId: number,
  ) {

    await this.sqs.send(

      new SendMessageCommand({

        QueueUrl:
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