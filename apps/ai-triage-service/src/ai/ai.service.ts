import { Injectable } from '@nestjs/common';
import { pool } from '../database/postgres';
import { BedrockService } from '../bedrock/bedrock.service';
import { ReportService } from '../report/report.service';
import { OnpremService } from '../onprem/onprem.service';

@Injectable()
export class AiService {
  constructor(
    private readonly bedrockService: BedrockService,
    private readonly reportService: ReportService,
    private readonly onpremService: OnpremService,
  ) {}

  async analyze(
    consultationId: string,
  ) {
    const consultation =
      await pool.query(
        `
        SELECT *
        FROM ai_care.consultations
        WHERE id = $1
        `,
        [consultationId],
      );

    if (
      consultation.rows.length === 0
    ) {
      throw new Error(
        'consultation not found',
      );
    }

    const text =
      await this.analysisText(
        consultationId,
        consultation.rows[0],
      );

    const modelResult =
      await this.bedrockService.analyze(
        text,
      );
    const result =
      this.toResultObject(
        this.normalizeModelResult(modelResult),
      );

    await pool.query(
      `
      INSERT INTO ai_care.ai_results
      (
        consultation_id,
        result_json
      )
      VALUES
      (
        $1,
        $2
      )
      ON CONFLICT
      (
        consultation_id
      )
      DO UPDATE SET
      result_json =
      EXCLUDED.result_json
      `,
      [
        consultationId,
        JSON.stringify(result),
      ],
    );

    const report = await this.reportService.createAndStore(
      consultation.rows[0],
      result,
    );

    return {
      ...result,
      pdfS3Key: report.key,
      pdfS3Bucket: report.bucket,
    };
  }

  async getResult(
    consultationId: string,
  ) {
    const result =
      await pool.query(
        `
        SELECT *
        FROM ai_care.ai_results
        WHERE consultation_id = $1
        `,
        [consultationId],
      );

    return result.rows[0];
  }

  async getReportDownloadUrl(
    consultationId: string,
  ) {
    return this.reportService.createDownloadUrl(
      consultationId,
    );
  }

  readLocalReport(
    key: string,
  ) {
    return this.reportService.readLocalReport(
      key,
    );
  }

  async testUsers() {
  const result = await pool.query(`
    SELECT
      id,
      email,
      nickname
    FROM ai_care.users
    LIMIT 5
  `);

  return result.rows;
}

async consultationTest() {
  const result = await pool.query(`
    SELECT *
    FROM ai_care.consultations
    LIMIT 5
  `);

  return result.rows;
}

async showTables() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN (
      'pg_catalog',
      'information_schema'
    )
    ORDER BY table_schema, table_name
  `);

  return result.rows;
}

  private normalizeModelResult(modelResult: unknown) {
    const parsed = this.extractJsonFromModelResult(modelResult);
    if (!parsed || typeof parsed !== 'object') {
      return modelResult;
    }

    const raw = parsed as Record<string, unknown>;
    const riskLevel = String(raw.risk_level ?? raw.riskLevel ?? 'UNKNOWN');
    const possibleDiseases = Array.isArray(raw.possibleDiseases)
      ? raw.possibleDiseases.map(String)
      : [];
    const symptomFindings = Array.isArray(raw.symptom_findings)
      ? raw.symptom_findings
      : Array.isArray(raw.symptomFindings)
        ? raw.symptomFindings
        : [];
    const departmentHint = String(raw.department_hint ?? raw.departmentHint ?? '소아청소년과');
    const recommendation = String(raw.recommendation ?? '');

    return {
      summary_title:
        raw.summary_title ??
        raw.summaryTitle ??
        (possibleDiseases.length > 0 ? '증상 기반 참고 요약' : 'AI 문진 참고 요약'),
      summary:
        raw.summary ??
        (possibleDiseases.length > 0
          ? `입력된 증상을 바탕으로 ${possibleDiseases.join(', ')} 관련 가능성을 참고할 수 있습니다.`
          : '입력된 증상을 바탕으로 AI 참고 요약을 생성했습니다.'),
      risk_level: riskLevel,
      department_hint:
        raw.department_hint ??
        raw.departmentHint ??
        '소아청소년과',
      recommendation,
      emergency: Boolean(raw.emergency),
      possible_diseases: possibleDiseases,
      risk_reason: raw.risk_reason ?? raw.riskReason ?? '',
      symptom_findings: symptomFindings,
      hospital_recommendation:
        raw.hospital_recommendation ??
        raw.hospitalRecommendation ??
        departmentHint,
      disclaimer: '본 결과는 의료진 진단을 대체하지 않는 참고용입니다.',
      model_raw: raw,
    };
  }

  private toResultObject(result: unknown): Record<string, unknown> {
    if (result && typeof result === 'object') {
      return result as Record<string, unknown>;
    }

    return {
      summary_title: 'AI questionnaire report',
      summary: String(result ?? ''),
      risk_level: 'UNKNOWN',
      emergency: false,
      possible_diseases: [],
      recommendation: '',
      model_raw: result,
    };
  }

  private extractJsonFromModelResult(modelResult: unknown): unknown {
    if (!modelResult || typeof modelResult !== 'object') {
      return modelResult;
    }

    const content = (modelResult as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      return modelResult;
    }

    const textBlock = content.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        'text' in item &&
        typeof (item as { text?: unknown }).text === 'string',
    ) as { text: string } | undefined;

    if (!textBlock) {
      return modelResult;
    }

    try {
      return JSON.parse(this.extractJsonText(textBlock.text));
    } catch {
      return modelResult;
    }
  }

  private extractJsonText(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return text.slice(start, end + 1);
    }

    return text;
  }

  private extractAnalysisText(
    rawPayload: Record<string, unknown>,
    contentData: unknown,
  ): string {
    const symptomText = rawPayload.symptomText;
    if (typeof symptomText === 'string' && symptomText.trim()) {
      return symptomText;
    }

    return JSON.stringify(contentData ?? rawPayload);
  }

  private async analysisText(
    consultationId: string,
    consultation: Record<string, unknown>,
  ): Promise<string> {
    try {
      const sensitiveConsultation =
        await this.onpremService.getConsultation(
          consultationId,
        );

      return this.extractAnalysisText(
        sensitiveConsultation.rawPayload,
        consultation.content_data,
      );
    } catch (error) {
      console.warn('Falling back to RDS consultation metadata for analysis', {
        consultationId,
        message: error instanceof Error ? error.message : String(error),
      });
      return this.extractAnalysisText(
        {},
        consultation.content_data ?? consultation.symptom_summary,
      );
    }
  }
}
