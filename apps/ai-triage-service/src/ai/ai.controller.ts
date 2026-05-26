import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ai/analyze-mock')
  analyzeMock(@Body() body: { consultationId: string }) {
    return this.aiService.analyzeByBody(body);
  }

  @Post('ai/questionnaires/:id/mock-result')
  mockResult(@Param('id') id: string) {
    return this.aiService.createMockResult(id);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'ai-triage-service' };
  }
}
