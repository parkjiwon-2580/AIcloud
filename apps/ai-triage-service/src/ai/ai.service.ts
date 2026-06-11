import { Injectable } from '@nestjs/common';
import { pool } from '../database/postgres';
import { KiwiService } from '../kiwi/kiwi.service';
import { BedrockService } from '../bedrock/bedrock.service';

@Injectable()
export class AiService {
  constructor(
    private readonly kiwiService: KiwiService,
    private readonly bedrockService: BedrockService,
  ) {}

  async analyze(
    consultationId: string,
  ) {
    const consultation =
      await pool.query(
        `
        SELECT *
        FROM consultations
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

    const content =
      consultation.rows[0]
        .content_data;

    const text =
      JSON.stringify(content);

    const kiwi =
      await this.kiwiService.analyze(
        text,
      );

    const result =
      await this.bedrockService.analyze(
        kiwi.tokens,
      );

    await pool.query(
      `
      INSERT INTO ai_results
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

    return result;
  }

  async getResult(
    consultationId: string,
  ) {
    const result =
      await pool.query(
        `
        SELECT *
        FROM ai_results
        WHERE consultation_id = $1
        `,
        [consultationId],
      );

    return result.rows[0];
  }

  async testUsers() {
  const result = await pool.query(`
    SELECT
      id,
      email,
      nickname
    FROM users
    LIMIT 5
  `);

  return result.rows;
}

async consultationTest() {
  const result = await pool.query(`
    SELECT *
    FROM consultations
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
}