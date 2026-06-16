import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class BedrockService {
  private readonly modelId =
    process.env.BEDROCK_MODEL_ID ??
    'global.anthropic.claude-haiku-4-5-20251001-v1:0';

  private readonly maxTokens = Number(process.env.BEDROCK_MAX_TOKENS ?? 700);
  private readonly fallbackToMock =
    (process.env.BEDROCK_FALLBACK_TO_MOCK ?? '').toLowerCase() === 'true';

  private readonly client =
    new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
    });

  async analyze(text: string) {
    if ((process.env.BEDROCK_MOCK ?? '').toLowerCase() === 'true') {
      return {
        content: [
          {
            text: JSON.stringify(this.mockResult(text)),
          },
        ],
      };
    }

    const prompt = [
      'You are a pediatric triage assistant. Use Korean.',
      'Return valid compact JSON only. No markdown.',
      `Original text: ${text}`,
      'Analyze Korean pediatric symptoms directly from the original text.',
      'Keep each sentence short.',
      'Schema: {"summary_title":"","summary":"","risk_level":"LOW|MEDIUM|HIGH","risk_reason":"","emergency":false,"symptom_findings":[{"term":"","meaning":"","severity":"LOW|MEDIUM|HIGH"}],"possibleDiseases":[],"department_hint":"","hospital_recommendation":"","recommendation":""}',
    ].join('\n');

    const command = new ConverseCommand({
      modelId: this.modelId,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: this.maxTokens,
        stopSequences: [],
      },
    });

    try {
      const response = await this.client.send(command);
      const text = response.output?.message?.content
        ?.map((item) => item.text ?? '')
        .join('')
        .trim();

      return {
        content: [
          {
            text: text ?? '',
          },
        ],
        stopReason: response.stopReason,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Bedrock converse error', {
        name: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : String(error),
        metadata:
          error && typeof error === 'object' && '$metadata' in error
            ? (error as { $metadata?: unknown }).$metadata
            : undefined,
      });

      if (this.fallbackToMock) {
        return {
          content: [
            {
              text: JSON.stringify(this.mockResult(text)),
            },
          ],
          stopReason: 'bedrock_error_fallback',
        };
      }

      const message = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : 'BedrockError';
      throw new BadGatewayException(
        `Bedrock converse failed for model ${this.modelId}: ${name}: ${message}`,
      );
    }
  }

  private mockResult(text: string) {
    const joined = String(text || '');
    const emergency = /경련|의식|호흡|청색|탈수|피|혈변|반복/.test(joined);
    const high = emergency || /고열|39|40|숨|처짐/.test(joined);
    const medium = high || /열|기침|설사|구토|발진|통증/.test(joined);

    return {
      summary_title: '로컬 AI 문진 요약',
      summary:
        joined.trim().length > 0
          ? '입력된 증상 원문을 기준으로 만든 로컬 테스트 요약입니다.'
          : '입력된 증상 내용을 기준으로 만든 로컬 테스트 요약입니다.',
      risk_level: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
      risk_reason: high
        ? '응급 또는 빠른 진료가 필요한 신호가 포함될 수 있습니다.'
        : medium
          ? '증상이 지속되거나 악화되면 진료 상담이 필요할 수 있습니다.'
          : '현재 입력만으로는 중증 위험 신호가 뚜렷하지 않습니다.',
      emergency,
      symptom_findings: [
        {
          term: joined.trim() || '입력 증상',
          meaning: '문진에 입력된 주요 증상입니다.',
          severity: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
        },
      ],
      possibleDiseases: medium
        ? ['감염성 질환', '호흡기 증상', '소화기 증상']
        : ['경과 관찰 가능 증상'],
      department_hint: high ? '소아청소년과 또는 응급실' : '소아청소년과',
      hospital_recommendation: high
        ? '가까운 응급실 또는 소아청소년과 진료를 우선 고려하세요.'
        : '가까운 소아청소년과 진료를 고려하세요.',
      recommendation: high
        ? '증상이 심하거나 지속되면 지체하지 말고 의료기관에 문의하세요.'
        : '수분 섭취와 컨디션을 관찰하고 증상이 악화되면 진료를 권장합니다.',
    };
  }
}
