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
      'Analyze Korean pediatric symptoms directly from the original text. Do not leave fields blank.',
      'Use specific evidence from the original text, such as fever temperature, duration, vomiting, diarrhea, oral intake, urine amount, behavior, breathing, rash, pain, and lethargy.',
      'Risk guide: HIGH when there is lethargy, reduced urine/dehydration concern, repeated vomiting, breathing difficulty, seizure, altered consciousness, blue lips, blood in stool/vomit, or fever around 39C or higher with poor condition. MEDIUM when symptoms need outpatient care soon but no urgent red flags. LOW when mild and stable.',
      'For HIGH risk, emergency must be true and recommendation must clearly say to contact a medical institution promptly or consider emergency care.',
      'possibleDiseases must include 2-4 likely categories in Korean. symptom_findings must include 4-8 findings with term, meaning, and severity.',
      'Keep Korean sentences practical and concise, but include enough detail for a parent.',
      'Schema: {"summary_title":"short Korean title","summary":"3-5 Korean sentences","risk_level":"LOW|MEDIUM|HIGH","risk_reason":"Korean reason using input evidence","emergency":false,"symptom_findings":[{"term":"증상/소견","meaning":"해석","severity":"LOW|MEDIUM|HIGH"}],"possible_diseases":["질환 가능성"],"possibleDiseases":["same values"],"department_hint":"진료과","hospital_recommendation":"병원 이용 권고","recommendation":"구체적 보호자 행동"}',
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
    const emergency = /경련|의식|호흡|청색|탈수|혈변|축\s*처|처져|소변량.*줄|소변.*줄/.test(joined);
    const high = emergency || /고열|39|40|숨|반복.*구토|구토.*2|설사.*3/.test(joined);
    const medium = high || /열|기침|설사|구토|발진|통증|콧물/.test(joined);
    const findings = [
      /38|39|40|발열|고열/.test(joined) && {
        term: '발열',
        meaning: '38도 후반에서 39도대 발열은 아이 상태와 동반 증상을 함께 봐야 합니다.',
        severity: high ? 'HIGH' : 'MEDIUM',
      },
      /기침|콧물/.test(joined) && {
        term: '호흡기 증상',
        meaning: '콧물과 기침은 감염성 호흡기 질환에서 흔히 동반됩니다.',
        severity: 'MEDIUM',
      },
      /구토/.test(joined) && {
        term: '구토',
        meaning: '구토가 반복되면 수분 섭취와 탈수 여부를 확인해야 합니다.',
        severity: 'MEDIUM',
      },
      /설사/.test(joined) && {
        term: '설사',
        meaning: '설사가 반복되면 탈수 위험이 높아질 수 있습니다.',
        severity: 'MEDIUM',
      },
      /소변량.*줄|소변.*줄/.test(joined) && {
        term: '소변량 감소',
        meaning: '소변량 감소는 탈수 가능성을 시사할 수 있어 중요한 위험 신호입니다.',
        severity: 'HIGH',
      },
      /축\s*처|처져|보채/.test(joined) && {
        term: '처짐 또는 보챔',
        meaning: '평소보다 축 처지거나 많이 보채는 모습은 빠른 진료 판단에 중요합니다.',
        severity: 'HIGH',
      },
    ].filter(Boolean);

    return {
      summary_title: high ? '고열과 탈수 위험 신호가 있는 문진' : '소아 증상 참고 요약',
      summary:
        joined.trim().length > 0
          ? '입력된 내용에서 발열, 호흡기 증상, 위장관 증상, 섭취 감소가 함께 보입니다. 소변량 감소와 축 처져 보임은 탈수나 전신 상태 저하 가능성을 확인해야 하는 신호입니다. 특히 39도대 발열과 반복되는 구토, 설사가 동반되어 빠른 진료 상담이 필요할 수 있습니다.'
          : '입력된 증상 내용이 부족해 일반적인 참고 안내만 제공합니다.',
      risk_level: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
      risk_reason: high
        ? '39도대 발열, 구토와 설사, 소변량 감소, 축 처져 보임이 함께 있어 탈수와 전신 상태 저하를 확인해야 합니다.'
        : medium
          ? '증상이 지속되거나 악화되면 진료 상담이 필요할 수 있습니다.'
          : '현재 입력만으로는 중증 위험 신호가 뚜렷하지 않습니다.',
      emergency,
      symptom_findings:
        findings.length > 0
          ? findings
          : [
              {
                term: joined.trim() || '입력 증상',
                meaning: '문진에 입력된 주요 증상입니다.',
                severity: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
              },
            ],
      possibleDiseases: medium
        ? ['바이러스성 호흡기 감염', '급성 위장관염', '탈수 가능성', '인플루엔자 등 발열성 감염']
        : ['경과 관찰 가능 증상'],
      department_hint: high ? '소아청소년과 또는 응급실' : '소아청소년과',
      hospital_recommendation: high
        ? '아이의 처짐, 소변량 감소, 수분 섭취 저하가 지속되면 오늘 바로 소아청소년과 또는 응급 진료를 고려하세요.'
        : '가까운 소아청소년과 진료를 고려하세요.',
      recommendation: high
        ? '수분을 조금씩 자주 먹이고 소변량, 의식 상태, 호흡, 체온 변화를 관찰하세요. 축 처짐이나 소변량 감소가 계속되면 지체하지 말고 의료기관에 문의하세요.'
        : '수분 섭취와 컨디션을 관찰하고 증상이 악화되면 진료를 권장합니다.',
    };
  }
}
