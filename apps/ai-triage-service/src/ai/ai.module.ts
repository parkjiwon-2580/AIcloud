import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { KiwiService } from '../kiwi/kiwi.service';
import { BedrockService } from '../bedrock/bedrock.service';
import { PdfReportService } from '../report/pdf-report.service';
import { ReportService } from '../report/report.service';
import { S3ReportService } from '../report/s3-report.service';
import { OnpremService } from '../onprem/onprem.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    KiwiService,
    BedrockService,
    PdfReportService,
    S3ReportService,
    ReportService,
    OnpremService,
  ],
})
export class AiModule {}
