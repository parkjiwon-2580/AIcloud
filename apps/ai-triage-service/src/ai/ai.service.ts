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
    const riskLevel = this.normalizeRiskLevel(
      raw.risk_level ?? raw.riskLevel,
    );
    const possibleDiseases = this.normalizeStringList(
      raw.possible_diseases ??
        raw.possibleDiseases ??
        raw.diseases ??
        raw.possible_diagnoses,
    );
    const symptomFindings = this.normalizeFindings(
      raw.symptom_findings ?? raw.symptomFindings ?? raw.findings,
    );
    const departmentHint = String(raw.department_hint ?? raw.departmentHint ?? '소아청소년과');
    const recommendation = String(
      raw.recommendation ??
        raw.care_recommendation ??
        raw.next_steps ??
        this.defaultRecommendation(riskLevel),
    );

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
      risk_reason:
        raw.risk_reason ??
        raw.riskReason ??
        this.defaultRiskReason(riskLevel),
      symptom_findings: symptomFindings,
      hospital_recommendation:
        raw.hospital_recommendation ??
        raw.hospitalRecommendation ??
        departmentHint,
      disclaimer: '본 결과는 의료진 진단을 대체하지 않는 참고용입니다.',
      model_raw: raw,
    };
  }

  private normalizeRiskLevel(value: unknown): 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' {
    const upper = String(value ?? '').toUpperCase();
    if (upper.includes('HIGH') || upper.includes('높')) return 'HIGH';
    if (upper.includes('MEDIUM') || upper.includes('중')) return 'MEDIUM';
    if (upper.includes('LOW') || upper.includes('낮')) return 'LOW';
    return 'UNKNOWN';
  }

  private normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(
            record.name ??
              record.term ??
              record.disease ??
              record.label ??
              '',
          );
        }
        return String(item ?? '');
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeFindings(value: unknown): Array<{
    term: string;
    meaning: string;
    severity: string;
  }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return {
            term: item,
            meaning: item,
            severity: 'MEDIUM',
          };
        }

        if (!item || typeof item !== 'object') {
          return undefined;
        }

        const record = item as Record<string, unknown>;
        const term = String(record.term ?? record.name ?? record.symptom ?? '').trim();
        const meaning = String(record.meaning ?? record.description ?? record.reason ?? term).trim();
        const severity = this.normalizeRiskLevel(record.severity);

        if (!term && !meaning) {
          return undefined;
        }

        return {
          term: term || meaning,
          meaning: meaning || term,
          severity,
        };
      })
      .filter(
        (
          item,
        ): item is {
          term: string;
          meaning: string;
          severity: string;
        } => Boolean(item),
      );
  }

  private defaultRiskReason(riskLevel: string): string {
    if (riskLevel === 'HIGH') {
      return '고열, 처짐, 섭취 감소, 소변량 감소 같은 위험 신호가 함께 있으면 빠른 진료가 필요할 수 있습니다.';
    }

    if (riskLevel === 'MEDIUM') {
      return '증상이 지속되거나 악화되면 소아청소년과 진료 상담이 필요할 수 있습니다.';
    }

    if (riskLevel === 'LOW') {
      return '현재 입력만으로는 응급 위험 신호가 뚜렷하지 않습니다.';
    }

    return '입력된 증상을 기준으로 위험도를 판단했습니다.';
  }

  private defaultRecommendation(riskLevel: string): string {
    if (riskLevel === 'HIGH') {
      return '증상이 심하거나 아이가 축 처져 보이면 지체하지 말고 의료기관에 문의하거나 응급 진료를 고려하세요.';
    }

    if (riskLevel === 'MEDIUM') {
      return '수분 섭취와 소변량을 관찰하고 증상이 지속되면 소아청소년과 진료를 권장합니다.';
    }

    return '충분히 쉬게 하고 증상 변화를 관찰하세요. 악화되면 진료를 권장합니다.';
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

    const jsonText = this.extractJsonText(textBlock.text);
    try {
      return JSON.parse(jsonText);
    } catch {
      const repaired = this.repairJsonText(jsonText);
      try {
        return JSON.parse(repaired);
      } catch {
        console.warn('AI model JSON parsing failed. Falling back to symptom-based result.', {
          preview: textBlock.text.slice(0, 300),
        });
        return this.fallbackResultFromText(textBlock.text);
      }
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

  private repairJsonText(text: string): string {
    return this.extractBalancedJsonObject(text)
      .replace(/^\uFEFF/, '')
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
  }

  private extractBalancedJsonObject(text: string): string {
    const source = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = source.indexOf('{');
    if (start < 0) return source;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }

    return source.slice(start);
  }

  private fallbackResultFromText(text: string): Record<string, unknown> {
    const compact = String(text || '').replace(/\s+/g, ' ').trim();
    const high =
      /40|39|고열|호흡곤란|숨.*거칠|숨.*힘|축\s*처|처짐|소변.*줄|탈수|경련|청색/.test(compact);
    const medium =
      high || /38|열|기침|구토|설사|발진|통증|콧물|호흡/.test(compact);

    return {
      summary_title: high ? '주의가 필요한 소아 증상' : '소아 증상 참고 요약',
      summary:
        compact.slice(0, 500) ||
        'AI 응답을 구조화하지 못했지만 입력된 증상을 기준으로 보호자 관찰과 진료 필요성을 안내합니다.',
      risk_level: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
      risk_reason: high
        ? '고열, 호흡 변화, 처짐, 탈수 가능성 같은 위험 신호가 포함되어 빠른 진료 판단이 필요할 수 있습니다.'
        : medium
          ? '증상이 지속되거나 악화되면 소아청소년과 진료 상담이 필요할 수 있습니다.'
          : '현재 입력만으로는 응급 위험 신호가 뚜렷하지 않습니다.',
      emergency: high,
      symptom_findings: this.fallbackFindings(compact, high),
      possible_diseases: medium
        ? ['호흡기 감염', '발열성 감염', '위장관 감염 또는 탈수 가능성'].filter((item) =>
            compact ? true : item !== '위장관 감염 또는 탈수 가능성',
          )
        : ['경과 관찰 가능 증상'],
      department_hint: high ? '소아청소년과 또는 응급실' : '소아청소년과',
      hospital_recommendation: high
        ? '고열이나 호흡 변화, 처짐이 계속되면 오늘 바로 소아청소년과 또는 응급 진료를 고려하세요.'
        : '증상이 지속되면 가까운 소아청소년과 진료를 고려하세요.',
      recommendation: high
        ? '체온, 호흡, 의식 상태, 수분 섭취와 소변량을 관찰하고 악화되면 지체하지 말고 의료기관에 문의하세요.'
        : '충분히 쉬게 하고 수분 섭취와 증상 변화를 관찰하세요. 악화되면 진료를 권장합니다.',
      model_raw_text: compact,
    };
  }

  private fallbackFindings(text: string, high: boolean): Array<{ term: string; meaning: string; severity: string }> {
    const findings = [
      /40|39|38|고열|열|발열/.test(text) && {
        term: '발열',
        meaning: '체온과 지속 시간을 함께 확인해야 합니다.',
        severity: high ? 'HIGH' : 'MEDIUM',
      },
      /숨|호흡|기침|콧물/.test(text) && {
        term: '호흡기 증상',
        meaning: '숨소리 변화나 기침은 호흡기 감염 또는 호흡 부담 여부를 확인해야 합니다.',
        severity: high ? 'HIGH' : 'MEDIUM',
      },
      /구토|설사/.test(text) && {
        term: '위장관 증상',
        meaning: '반복되면 수분 부족과 탈수 여부를 확인해야 합니다.',
        severity: 'MEDIUM',
      },
      /축\s*처|처짐|보채|소변.*줄|탈수/.test(text) && {
        term: '전신 상태 변화',
        meaning: '처짐이나 소변량 감소는 빠른 진료 판단에 중요한 신호입니다.',
        severity: 'HIGH',
      },
    ].filter(Boolean) as Array<{ term: string; meaning: string; severity: string }>;

    return findings.length
      ? findings
      : [
          {
            term: '입력 증상',
            meaning: text.slice(0, 120) || '입력된 증상 내용입니다.',
            severity: high ? 'HIGH' : 'MEDIUM',
          },
        ];
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
