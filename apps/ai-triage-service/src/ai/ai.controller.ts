import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('users-test')
  usersTest() {
    return this.aiService.testUsers();
  }

  @Get('consultation-test')
  consultationTest() {
    return this.aiService.consultationTest();
  }

  @Post('ai/analyze')
  analyze(
    @Body()
    body: {
      consultationId: string;
    },
  ) {
    return this.aiService.analyze(
      body.consultationId,
    );
  }

  @Get('ai/result/:consultationId')
  getResult(
    @Param('consultationId')
    consultationId: string,
  ) {
    return this.aiService.getResult(
      consultationId,
    );
  }

  @Get('tables')
tables() {
  return this.aiService.showTables();
}
}