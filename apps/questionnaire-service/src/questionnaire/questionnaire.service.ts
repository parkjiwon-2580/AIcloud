import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OnpremService } from '../onprem/onprem.service';
import { RequestUserService } from '../request-user.service';
import { SqsService } from '../sqs/sqs.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { pool } from '../database/postgres';

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

    const createdAt = new Date();

    await pool.query(
      `
      INSERT INTO ai_care.consultations
      (
        id,
        user_id,
        child_id,
        content_data,
        symptom_summary
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        id,
        userId,
        dto.childId,
        JSON.stringify(contentData),
        symptomSummary,
      ],
    );

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
      await this.rollbackConsultation(id);
      throw error;
    }

    const event = await this.sqs.sendQuestionnaireMessage({
      consultationId: id,
      userId,
      createdAt,
    });

    return {
      consultationId: id,
      status: 'created',
      message: '문진이 저장되었습니다.',
      event,
    };
  }

  async history(
  authorization?: string,
  childId?: string,
) {
  const user =
    this.requestUser.requireUser(
      authorization,
    );

  const result =
    await pool.query(
      `
      SELECT
        c.id,
        c.child_id,
        c.symptom_summary,
        c.created_at,
        ar.result_json,
        ca.s3_key
      FROM ai_care.consultations c
      LEFT JOIN ai_care.ai_results ar
        ON ar.consultation_id = c.id
      LEFT JOIN ai_care.consultation_assets ca
        ON ca.consultation_id = c.id
      WHERE c.user_id = $1
      ${
        childId
          ? 'AND c.child_id = $2'
          : ''
      }
      ORDER BY c.created_at DESC
      `,
      childId
        ? [user.id, childId]
        : [user.id],
    );

  return result.rows.map(
    (consultation) => ({
      consultationId:
        consultation.id,
      childId:
        consultation.child_id,
      createdAt:
        consultation.created_at,
      title:
        consultation.result_json?.summary_title ??
        consultation.result_json?.summaryTitle ??
        consultation.symptom_summary ??
        '문진 기록',
      symptomSummary:
        consultation.symptom_summary,
      riskLevel:
        consultation.result_json?.risk_level ??
        consultation.result_json?.riskLevel ??
        'UNKNOWN',
      departmentHint:
        consultation.result_json?.department_hint ??
        consultation.result_json?.departmentHint ??
        null,
      pdfS3Key:
        consultation.s3_key ?? null,
    }),
  );
}

  async result(
  id: string,
  authorization?: string,
) {
  const user =
    this.requestUser.requireUser(
      authorization,
    );

  const result =
    await pool.query(
      `
      SELECT
        c.id,
        c.child_id,
        c.symptom_summary,
        ar.result_json,
        ca.s3_key
      FROM ai_care.consultations c
      LEFT JOIN ai_care.ai_results ar
        ON ar.consultation_id = c.id
      LEFT JOIN ai_care.consultation_assets ca
        ON ca.consultation_id = c.id
      WHERE c.id = $1
      AND c.user_id = $2
      `,
      [id, user.id],
    );

  if (
    result.rows.length === 0
  ) {
    throw new NotFoundException(
      'Consultation not found',
    );
  }

  const consultation =
    result.rows[0];

  return {
    consultationId:
      consultation.id,
    childId:
      consultation.child_id,
    symptomSummary:
      consultation.symptom_summary,
    resultJson:
      consultation.result_json,
    pdfS3Key:
      consultation.s3_key ?? null,
  };
}

  private async rollbackConsultation(id: string): Promise<void> {
    await pool
      .query(
        `
        DELETE FROM ai_care.consultations
        WHERE id = $1
        `,
        [id],
      )
      .catch(() => undefined);
  }

  private extractKeywords(symptomText: string): string[] {
    return KNOWN_SYMPTOMS.filter((keyword) => symptomText.includes(keyword)).slice(0, 5);
  }

  private buildSymptomSummary(keywords: string[]): string {
    return keywords.length > 0 ? `${keywords.join('·')} 증상` : '증상 입력';
  }
}
