import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { readEnv, readNumberEnv } from '../config';

export interface HospitalRecommendation {
  name: string;
  distance: string;
  openingHours: string;
  isOpen: boolean;
  address: string;
  department: string;
}

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  async recommend(department = '소아청소년과', region = '서울'): Promise<HospitalRecommendation[]> {
    const apiKey = readEnv('MAP_API_KEY');
    const provider = readEnv('MAP_API_PROVIDER', apiKey ? 'kakao' : 'mock');
    if (provider === 'kakao' && apiKey) {
      return this.searchKakao(department, region, apiKey);
    }
    this.logger.log('MAP_API_KEY is empty or MAP_API_PROVIDER=mock. Returning mock hospital recommendations.');
    return this.mockRecommendations(department, region);
  }

  private async searchKakao(department: string, region: string, apiKey: string): Promise<HospitalRecommendation[]> {
    const baseUrl = readEnv('MAP_API_BASE_URL', 'https://dapi.kakao.com');
    const timeout = readNumberEnv('MAP_API_TIMEOUT_MS', 3000);
    const query = `${region} ${department}`;
    const response = await axios.get(`${baseUrl}/v2/local/search/keyword.json`, {
      params: { query, size: 5 },
      headers: { Authorization: `KakaoAK ${apiKey}` },
      timeout,
    });
    return (response.data.documents ?? []).map((item: Record<string, string>, index: number) => ({
      name: item.place_name,
      distance: item.distance ? `${Number(item.distance) / 1000}km` : `${(index + 1) * 0.7}km`,
      openingHours: '운영시간 확인 필요',
      isOpen: true,
      address: item.road_address_name || item.address_name || region,
      department,
    }));
  }

  private mockRecommendations(department: string, region: string): HospitalRecommendation[] {
    return [
      {
        name: '아이사랑소아청소년과',
        distance: '1.2km',
        openingHours: '09:00-18:00',
        isOpen: true,
        address: `${region} 중심로 12`,
        department,
      },
      {
        name: '푸른별 소아과',
        distance: '2.0km',
        openingHours: '09:30-19:00',
        isOpen: true,
        address: `${region} 건강길 7`,
        department,
      },
      {
        name: '튼튼 어린이병원',
        distance: '2.8km',
        openingHours: '09:00-21:00',
        isOpen: false,
        address: `${region} 안심대로 33`,
        department,
      },
    ];
  }
}
