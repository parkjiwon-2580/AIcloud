import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';

type ReportInput = {
  consultationId: string;
  childId?: string | null;
  symptomSummary?: string | null;
  result: Record<string, unknown>;
  createdAt?: Date | string | null;
};

@Injectable()
export class PdfReportService {
  async create(input: ReportInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: 'AI Care Questionnaire Report',
          Author: 'ai-triage-service',
        },
      });

      document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      this.useConfiguredFont(document);
      this.render(document, input);
      document.end();
    });
  }

  private useConfiguredFont(document: PDFKit.PDFDocument) {
    const fontPath = process.env.REPORT_FONT_PATH;
    if (fontPath && existsSync(fontPath)) {
      document.font(fontPath);
      return;
    }

    document.font('Helvetica');
  }

  private render(document: PDFKit.PDFDocument, input: ReportInput) {
    const result = input.result ?? {};
    const riskLevel = String(result.risk_level ?? result.riskLevel ?? 'UNKNOWN');
    const title = String(result.summary_title ?? result.summaryTitle ?? 'AI Questionnaire Report');
    const summary = String(result.summary ?? '');
    const departmentHint = String(result.department_hint ?? result.departmentHint ?? '');
    const recommendation = String(result.recommendation ?? '');
    const disclaimer = String(
      result.disclaimer ??
        'This report is for reference only and does not replace medical diagnosis.',
    );

    document.fontSize(20).text(title, { align: 'left' });
    document.moveDown(0.75);
    document.fontSize(10).fillColor('#666666').text(`Consultation ID: ${input.consultationId}`);
    document.text(`Child ID: ${input.childId ?? '-'}`);
    document.text(`Created At: ${this.formatDate(input.createdAt)}`);
    document.moveDown();

    this.section(document, 'Symptom Summary', input.symptomSummary ?? '-');
    this.section(document, 'Risk Level', riskLevel);
    this.section(document, 'AI Summary', summary || '-');
    this.section(document, 'Recommended Department', departmentHint || '-');
    this.section(document, 'Recommendation', recommendation || '-');

    const diseases = result.possible_diseases ?? result.possibleDiseases;
    if (Array.isArray(diseases) && diseases.length > 0) {
      this.section(document, 'Possible Conditions', diseases.map(String).join(', '));
    }

    document.moveDown();
    document.fontSize(9).fillColor('#777777').text(disclaimer, {
      lineGap: 3,
    });
  }

  private section(document: PDFKit.PDFDocument, title: string, body: string) {
    document.fillColor('#111111').fontSize(13).text(title);
    document.moveDown(0.25);
    document.fillColor('#333333').fontSize(11).text(body, {
      lineGap: 4,
    });
    document.moveDown();
  }

  private formatDate(value?: Date | string | null) {
    if (!value) {
      return new Date().toISOString();
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
}
