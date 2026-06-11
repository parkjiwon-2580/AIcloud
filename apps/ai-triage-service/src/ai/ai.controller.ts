import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('users-test')
  usersTest() {
    return this.aiService.testUsers();
  }
  
  @Get('health')
  health() {
    return { status: 'ok', service: 'ai-triage-service' };
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

  @Get('ai/report/:consultationId/download')
  getReportDownloadUrl(
    @Param('consultationId')
    consultationId: string,
  ) {
    return this.aiService.getReportDownloadUrl(
      consultationId,
    );
  }

  @Get('ai/local-report/:key')
  getLocalReport(
    @Param('key')
    key: string,
    @Res()
    response: any,
  ) {
    const pdf = this.aiService.readLocalReport(
      decodeURIComponent(key),
    );
    response.setHeader('content-type', 'application/pdf');
    response.setHeader('content-disposition', 'attachment; filename="consultation-report.pdf"');
    response.send(pdf);
  }

  @Get('tables')
tables() {
  return this.aiService.showTables();
}
}
