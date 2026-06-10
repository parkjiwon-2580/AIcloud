import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { readNumberEnv, requireEnv } from '../config';

@Injectable()
export class OnpremService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: requireEnv('ONPREM_API_BASE_URL'),
      timeout: readNumberEnv('ONPREM_API_TIMEOUT_MS', 10000),
    });
  }

  async createProfile(cloudUserId: string): Promise<string> {
    const response = await this.post('/internal/sensitive/profile', {
      cloud_user_id: cloudUserId,
    });
    return response.sensitive_profile_id;
  }

  async createChild(input: {
    cloudUserId: string;
    name: string;
    birthDate: string;
    gender: string;
    detailJson?: Record<string, unknown>;
  }): Promise<string> {
    const response = await this.post('/internal/sensitive/children', {
      cloud_user_id: input.cloudUserId,
      name: input.name,
      birth_date: input.birthDate,
      gender: input.gender,
      detail_json: input.detailJson ?? {},
    });
    return response.sensitive_child_id;
  }

  async listChildren(cloudUserId: string) {
    return this.request('/internal/sensitive/children', () =>
      this.client.get('/internal/sensitive/children', {
        params: { cloud_user_id: cloudUserId },
      }),
    );
  }

  async updateChild(childId: string, input: {
    name?: string;
    birthDate?: string;
    gender?: string;
    detailJson?: Record<string, unknown>;
  }) {
    const path = `/internal/sensitive/children/${childId}`;
    return this.request(path, () =>
      this.client.patch(path, {
        name: input.name,
        birth_date: input.birthDate,
        gender: input.gender,
        detail_json: input.detailJson,
      }),
    );
  }

  private async post(path: string, body: Record<string, unknown>) {
    return this.request(path, () => this.client.post(path, body));
  }

  private async request<T>(path: string, operation: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const response = await operation();
      return response.data;
    } catch {
      throw new BadGatewayException(`onprem-sensitive-api request failed: ${path}`);
    }
  }
}
