import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { KiwiService } from '../kiwi/kiwi.service';
import { BedrockService } from '../bedrock/bedrock.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    KiwiService,
    BedrockService,
  ],
})
export class AiModule {}