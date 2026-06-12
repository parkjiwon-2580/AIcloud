import { Injectable } from '@nestjs/common';
import { pool } from '../database/postgres';
import { PdfReportService } from './pdf-report.service';
import { S3ReportService } from './s3-report.service';

type ConsultationRow = {
  id: string;
  child_id?: string | null;
  symptom_summary?: string | null;
  created_at?: Date | string | null;
};

@Injectable()
export class ReportService {
  constructor(
    private readonly pdfReport: PdfReportService,
    private readonly s3Report: S3ReportService,
  ) {}

  async createAndStore(consultation: ConsultationRow, result: Record<string, unknown>) {
    const pdf = await this.pdfReport.create({
      consultationId: consultation.id,
      childId: consultation.child_id,
      symptomSummary: consultation.symptom_summary,
      createdAt: consultation.created_at,
      result,
    });

    const uploaded = await this.s3Report.uploadReport(consultation.id, pdf);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        DELETE FROM ai_care.consultation_assets
        WHERE consultation_id = $1
        AND asset_type = 'AI_REPORT_PDF'
        `,
        [consultation.id],
      );

      await client.query(
        `
        INSERT INTO ai_care.consultation_assets
        (
          consultation_id,
          asset_type,
          s3_bucket,
          s3_key
        )
        VALUES
        (
          $1,
          'AI_REPORT_PDF',
          $2,
          $3
        )
        `,
        [consultation.id, uploaded.bucket, uploaded.key],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return uploaded;
  }

  async createDownloadUrl(consultationId: string) {
    const result = await pool.query(
      `
      SELECT s3_key
      FROM ai_care.consultation_assets
      WHERE consultation_id = $1
      AND asset_type = 'AI_REPORT_PDF'
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1
      `,
      [consultationId],
    );

    const key = result.rows[0]?.s3_key;
    if (!key) {
      return null;
    }

    return {
      s3Key: key,
      downloadUrl: await this.s3Report.createDownloadUrl(key),
    };
  }

  readLocalReport(key: string) {
    return this.s3Report.readLocalReport(key);
  }
}
