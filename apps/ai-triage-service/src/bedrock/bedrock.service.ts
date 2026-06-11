import { Injectable } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class BedrockService {
  private readonly client =
    new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
    });

  async analyze(tokens: string[]) {
    if ((process.env.BEDROCK_MOCK ?? '').toLowerCase() === 'true') {
      return {
        content: [
          {
            text: JSON.stringify(this.mockResult(tokens)),
          },
        ],
      };
    }

    const prompt = `
You are a pediatric questionnaire analysis assistant.

Symptoms:
${tokens.join(', ')}

Return JSON only:
{
  "summary_title": "",
  "summary": "",
  "risk_level": "LOW|MEDIUM|HIGH",
  "emergency": false,
  "possibleDiseases": [],
  "department_hint": "",
  "recommendation": ""
}
`;

    const command =
      new InvokeModelCommand({
        modelId:
          process.env.BEDROCK_MODEL_ID ??
          'anthropic.claude-3-5-haiku-20241022-v1:0',
        body: JSON.stringify({
          anthropic_version:
            'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

    const response =
      await this.client.send(command);

    return JSON.parse(
      Buffer.from(
        response.body,
      ).toString(),
    );
  }

  private mockResult(tokens: string[]) {
    const joined = tokens.join(' ');
    const emergency = /경련|의식|호흡|청색|탈수|피|혈변|반복/.test(joined);
    const high = emergency || /고열|39|40|숨|처짐/.test(joined);
    const medium = high || /열|기침|설사|구토|발진|통증/.test(joined);

    return {
      summary_title: '로컬 AI 문진 요약',
      summary:
        tokens.length > 0
          ? `입력된 증상 키워드(${tokens.slice(0, 8).join(', ')})를 기준으로 만든 로컬 테스트 요약입니다.`
          : '입력된 증상 내용을 기준으로 만든 로컬 테스트 요약입니다.',
      risk_level: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
      emergency,
      possibleDiseases: medium
        ? ['감염성 질환', '호흡기 증상', '소화기 증상']
        : ['경과 관찰 가능 증상'],
      department_hint: high ? '소아청소년과 또는 응급실' : '소아청소년과',
      recommendation: high
        ? '증상이 심하거나 지속되면 지체하지 말고 의료기관에 문의하세요.'
        : '수분 섭취와 컨디션을 관찰하고 증상이 악화되면 진료를 권장합니다.',
    };
  }
}
