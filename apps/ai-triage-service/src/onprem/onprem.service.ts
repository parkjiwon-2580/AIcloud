import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class OnpremService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.ONPREM_API_BASE_URL ?? 'http://onprem-sensitive-api:9000',
      timeout: Number(process.env.ONPREM_API_TIMEOUT_MS ?? 10000),
    });
  }

  async getConsultation(consultationId: string): Promise<{
    rawPayload: Record<string, unknown>;
  }> {
    try {
      const response = await this.client.get(
        `/internal/sensitive/consultation/${encodeURIComponent(consultationId)}`,
      );

      return {
        rawPayload: response.data.raw_payload ?? {},
      };
    } catch (error) {
      console.error('onprem-sensitive-api consultation lookup failed', {
        baseURL: process.env.ONPREM_API_BASE_URL ?? 'http://onprem-sensitive-api:9000',
        consultationId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new BadGatewayException('onprem-sensitive-api consultation lookup failed');
    }
  }
}
