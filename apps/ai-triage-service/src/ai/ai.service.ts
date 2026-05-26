import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { readEnv } from '../config';

const KNOWN_SYMPTOMS = ['발열', '열', '기침', '콧물', '구토', '설사', '복통', '두통', '발진', '가래'];

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  analyzeByBody(input: { consultationId: string }) {
    return this.createMockResult(input.consultationId);
  }

  async createMockResult(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    const keywords = KNOWN_SYMPTOMS.filter((keyword) => (consultation.symptomSummary ?? '').includes(keyword));
    const title = keywords.length > 0 ? `${keywords.join('·')} 증상` : '영유아 증상 상담';
    const resultJson = {
      summary_title: title,
      summary: `입력된 증상 기준으로 ${title}이 주요 증상입니다.`,
      risk_level: 'MEDIUM',
      department_hint: '소아청소년과',
      recommendation: '증상이 지속되거나 고열이 동반되면 의료진 진료를 권장합니다.',
      disclaimer: '본 결과는 의료진 진단을 대체하지 않는 참고용입니다.',
    };

    const result = await this.prisma.aiResult.upsert({
      where: { consultationId },
      create: {
        id: randomUUID(),
        consultationId,
        resultJson,
      },
      update: {
        resultJson,
      },
    });

    const prefix = readEnv('S3_REPORT_PREFIX', 'reports/').replace(/\/?$/, '/');
    const s3Key = `${prefix}consultations/${consultationId}/result.pdf`;
    const existingAsset = await this.prisma.consultationAsset.findFirst({
      where: { consultationId, s3Key },
    });
    const asset = existingAsset ?? await this.prisma.consultationAsset.create({
      data: {
        id: randomUUID(),
        consultationId,
        s3Key,
      },
    });

    return { result, pdfS3Key: asset.s3Key };
  }
}
