import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { readNumberEnv, requireEnv } from '../config';

@Injectable()
export class OnpremService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: requireEnv('ONPREM_API_BASE_URL'),
      timeout: readNumberEnv('ONPREM_API_TIMEOUT_MS', 3000),
    });
  }

  async storeConsultation(input: {
    consultationId: string;
    cloudUserId: string;
    rawPayload: Record<string, unknown>;
  }): Promise<void> {
    await this.post('/internal/sensitive/consultation', {
      consultation_id: input.consultationId,
      cloud_user_id: input.cloudUserId,
      raw_payload: input.rawPayload,
    });
  }

  private async post(path: string, body: Record<string, unknown>) {
    try {
      const response = await this.client.post(path, body);
      return response.data;
    } catch (error) {
      throw new BadGatewayException(`onprem-sensitive-api request failed: ${path}`);
    }
  }
}
