import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    SqsConsumerService,
  ],
})
export class AiModule {}