import { Injectable } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class BedrockService {
  private readonly client =
    new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
    });

  async analyze(tokens: string[]) {
    const prompt = `
너는 영유아 문진 분석 AI다.

증상:
${tokens.join(',')}

JSON으로만 답변

{
 "riskLevel":"",
 "emergency":false,
 "possibleDiseases":[],
 "recommendation":""
}
`;

    const command =
      new InvokeModelCommand({
        modelId:
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
}