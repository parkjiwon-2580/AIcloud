import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';

import { AiService } from './ai.service';

@Injectable()
export class SqsConsumerService
  implements OnModuleInit {

  private readonly logger =
    new Logger(SqsConsumerService.name);

  private readonly sqs =
    new SQSClient({
      region:
        process.env.AWS_REGION ??
        'ap-northeast-2',
    });

  constructor(
    private readonly aiService: AiService,
  ) {}

  onModuleInit() {
    this.startPolling();
  }

  private startPolling() {

    setInterval(async () => {
      await this.poll();
    }, 5000);
  }

  private async poll() {

    const queueUrl =
      process.env.SQS_TRIAGE_QUEUE_URL;

    if (!queueUrl) {
      return;
    }

    const result =
      await this.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        }),
      );

    if (!result.Messages?.length) {
      return;
    }

    for (const message of result.Messages) {

      try {

        const body =
          JSON.parse(message.Body!);

        this.logger.log(
          `Received consultation=${body.consultation_id}`,
        );

        await this.aiService.createMockResult(
          body.consultation_id,
        );

        await this.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle:
              message.ReceiptHandle!,
          }),
        );

      } catch (err) {

        this.logger.error(err);
      }
    }
  }
}