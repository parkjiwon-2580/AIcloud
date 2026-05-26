import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OnpremService } from '../onprem/onprem.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUserService } from '../request-user.service';
import { SqsService } from '../sqs/sqs.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';

const KNOWN_SYMPTOMS = [
  '발열',
  '열',
  '기침',
  '콧물',
  '구토',
  '설사',
  '복통',
  '두통',
  '발진',
  '가래',
  '호흡',
  '재채기',
];

@Injectable()
export class QuestionnaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onprem: OnpremService,
    private readonly sqs: SqsService,
    private readonly requestUser: RequestUserService,
  ) {}

  async create(dto: CreateQuestionnaireDto, authorization?: string) {
    const authUser = this.requestUser.getUser(authorization);
    // TODO: JWT rollout 이후 cloudUserId body fallback은 제거한다.
    const userId = authUser?.id ?? dto.cloudUserId;
    if (!userId) {
      throw new BadRequestException('cloudUserId is required until JWT is enabled');
    }

    const id = randomUUID();
    const symptomKeywords = this.extractKeywords(dto.symptomText);
    const symptomSummary = this.buildSymptomSummary(symptomKeywords);
    const contentData = {
      child_id: dto.childId,
      user_input: {
        symptom_keywords: symptomKeywords,
        symptom_summary: symptomSummary,
      },
      privacy: {
        raw_text_stored_in_rds: false,
        direct_identifiers_included: false,
      },
    };

    const consultation = await this.prisma.consultation.create({
      data: {
        id,
        userId,
        childId: dto.childId,
        contentData,
        symptomSummary,
      },
    });

    try {
      await this.onprem.storeConsultation({
        consultationId: id,
        cloudUserId: userId,
        rawPayload: {
          childId: dto.childId,
          symptomText: dto.symptomText,
        },
      });
    } catch (error) {
      await this.prisma.consultation.delete({ where: { id } }).catch(() => undefined);
      throw error;
    }

    const event = await this.sqs.sendQuestionnaireMessage({
      consultationId: id,
      userId,
      createdAt: consultation.createdAt,
    });

    return {
      consultationId: id,
      status: 'created',
      message: '문진이 저장되었습니다.',
      event,
    };
  }

  async history(authorization?: string, childId?: string) {
    const user = this.requestUser.requireUser(authorization);
    const consultations = await this.prisma.consultation.findMany({
      where: {
        userId: user.id,
        ...(childId ? { childId } : {}),
      },
      include: {
        result: true,
        assets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return consultations.map((consultation) => {
      const resultJson = (consultation.result?.resultJson ?? {}) as Record<string, string>;
      return {
        consultationId: consultation.id,
        childId: consultation.childId,
        createdAt: consultation.createdAt,
        title: resultJson.summary_title ?? consultation.symptomSummary ?? '문진 기록',
        symptomSummary: consultation.symptomSummary,
        riskLevel: resultJson.risk_level ?? 'UNKNOWN',
        departmentHint: resultJson.department_hint ?? null,
        pdfS3Key: consultation.assets[0]?.s3Key ?? null,
      };
    });
  }

  async result(id: string, authorization?: string) {
    const user = this.requestUser.requireUser(authorization);
    const consultation = await this.findOwnedConsultation(id, user.id);
    const result = await this.prisma.aiResult.findUnique({
      where: { consultationId: id },
    });
    const asset = await this.prisma.consultationAsset.findFirst({
      where: { consultationId: id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      consultationId: consultation.id,
      childId: consultation.childId,
      resultJson: result?.resultJson ?? null,
      pdfS3Key: asset?.s3Key ?? null,
    };
  }

  private async findOwnedConsultation(id: string, userId: string) {
    const consultation = await this.prisma.consultation.findUnique({ where: { id } });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    if (consultation.userId !== userId) {
      throw new ForbiddenException('Not your consultation');
    }
    return consultation;
  }

  private extractKeywords(symptomText: string): string[] {
    return KNOWN_SYMPTOMS.filter((keyword) => symptomText.includes(keyword)).slice(0, 5);
  }

  private buildSymptomSummary(keywords: string[]): string {
    return keywords.length > 0 ? `${keywords.join('·')} 증상` : '증상 입력';
  }
}
