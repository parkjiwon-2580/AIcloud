import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { readEnv, readNumberEnv } from '../config';

export interface HospitalRecommendation {
  name: string;
  distance: string;
  openingHours: string;
  isOpen: boolean | null;
  address: string;
  department: string;
  categoryName?: string;
  phone?: string;
  url?: string;
  weeklyOpeningHours?: string[];
  openingHoursSource?: string;
}

interface GooglePlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

interface GooglePlaceDetails {
  businessStatus?: string;
  currentOpeningHours?: GooglePlaceOpeningHours;
  regularOpeningHours?: GooglePlaceOpeningHours;
}

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  async recommend(department = '소아청소년과', region = '서울', keyword = ''): Promise<HospitalRecommendation[]> {
    const apiKey = readEnv('MAP_API_KEY');
    const provider = readEnv('MAP_API_PROVIDER', apiKey ? 'kakao' : 'mock');
    if (provider === 'kakao' && apiKey) {
      return this.searchKakao(department, region, keyword, apiKey);
    }
    this.logger.log('MAP_API_KEY is empty or MAP_API_PROVIDER=mock. Returning mock hospital recommendations.');
    return this.mockRecommendations(department, region);
  }

  private async searchKakao(
    department: string,
    region: string,
    keyword: string,
    apiKey: string,
  ): Promise<HospitalRecommendation[]> {
    const baseUrl = readEnv('MAP_API_BASE_URL', 'https://dapi.kakao.com');
    const timeout = readNumberEnv('MAP_API_TIMEOUT_MS', 3000);
    const normalizedDepartment = this.normalizeDepartment(department);
    const normalizedKeyword = this.normalizeKeyword(keyword);
    const directNameSearch = this.isDirectHospitalName(normalizedKeyword);
    const query = this.buildKakaoQuery(region, normalizedDepartment, normalizedKeyword);
    const response = await axios.get(`${baseUrl}/v2/local/search/keyword.json`, {
      params: { query, category_group_code: 'HP8', size: 10 },
      headers: { Authorization: `KakaoAK ${apiKey}` },
      timeout,
    });

    const documents = (response.data.documents ?? []) as Array<Record<string, string>>;
    const regionMatched = documents.filter((item) => this.matchesRegion(item, region));
    const hasRegionScope = this.hasRegionScope(region);
    const scopedDocuments = hasRegionScope ? regionMatched : documents;
    const filtered = directNameSearch
      ? scopedDocuments
      : scopedDocuments.filter((item) => this.matchesDepartment(item, normalizedDepartment || normalizedKeyword));
    const results = filtered.length ? filtered : scopedDocuments;

    const hospitals = results.slice(0, 5).map((item: Record<string, string>, index: number) => ({
      name: item.place_name,
      distance: item.distance ? `${(Number(item.distance) / 1000).toFixed(1)}km` : `${index + 1}번째 결과`,
      openingHours: '영업시간 확인 필요',
      isOpen: null,
      address: item.road_address_name || item.address_name || region,
      department: normalizedDepartment || normalizedKeyword || '전체 병원',
      categoryName: item.category_name || '',
      phone: item.phone || '',
      url: item.place_url || '',
    }));

    return this.enrichOpeningHours(hospitals);
  }

  private async enrichOpeningHours(hospitals: HospitalRecommendation[]): Promise<HospitalRecommendation[]> {
    const googleApiKey = readEnv('GOOGLE_MAPS_API_KEY');
    const limit = Math.min(readNumberEnv('GOOGLE_PLACES_OPENING_HOURS_LIMIT', 3), hospitals.length);
    if (!googleApiKey || limit <= 0) return hospitals;

    const targets = hospitals.slice(0, limit);
    const enriched = await Promise.all(
      targets.map(async (hospital) => {
        try {
          return await this.enrichOneOpeningHours(hospital, googleApiKey);
        } catch (error) {
          this.logger.warn(`Failed to enrich opening hours for ${hospital.name}: ${(error as Error).message}`);
          return hospital;
        }
      }),
    );

    return [...enriched, ...hospitals.slice(limit)];
  }

  private async enrichOneOpeningHours(hospital: HospitalRecommendation, apiKey: string): Promise<HospitalRecommendation> {
    const timeout = readNumberEnv('MAP_API_TIMEOUT_MS', 3000);
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: `${hospital.name} ${hospital.address}`,
        languageCode: 'ko',
        regionCode: 'KR',
        pageSize: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.businessStatus,places.currentOpeningHours,places.regularOpeningHours',
        },
        timeout,
      },
    );

    const details = response.data?.places?.[0] as GooglePlaceDetails | undefined;
    return details ? this.applyGoogleOpeningHours(hospital, details) : hospital;
  }

  private applyGoogleOpeningHours(
    hospital: HospitalRecommendation,
    details: GooglePlaceDetails,
  ): HospitalRecommendation {
    const openingHours = details.currentOpeningHours || details.regularOpeningHours;
    const weeklyOpeningHours = openingHours?.weekdayDescriptions || [];
    const todayOpeningHours = this.todayOpeningHours(weeklyOpeningHours);
    const isOpen = typeof openingHours?.openNow === 'boolean' ? openingHours.openNow : hospital.isOpen;

    return {
      ...hospital,
      isOpen,
      openingHours: todayOpeningHours || weeklyOpeningHours[0] || hospital.openingHours,
      weeklyOpeningHours,
      openingHoursSource: 'google',
    };
  }

  private todayOpeningHours(weekdayDescriptions: string[]): string {
    if (!weekdayDescriptions.length) return '';
    const koreanDay = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][new Date().getDay()];
    return weekdayDescriptions.find((description) => description.startsWith(koreanDay)) || '';
  }

  private normalizeDepartment(department: string): string {
    const value = String(department || '').replace(/\s+/g, '');
    if (!value || value === '전체' || value === '전체병원') return '';
    if (/소아|아기|아이|영유아|어린이|키즈/.test(value)) return '소아청소년과';
    if (/응급|야간|심야/.test(value)) return '응급실';
    if (/이비인후|귀|코|목|중이염|비염/.test(value)) return '이비인후과';
    if (/피부|발진|두드러기|아토피/.test(value)) return '피부과';
    return department || '';
  }

  private normalizeKeyword(keyword: string): string {
    return String(keyword || '').trim().replace(/\s+/g, ' ');
  }

  private buildKakaoQuery(region: string, department: string, keyword: string): string {
    if (keyword && department && !this.isDirectHospitalName(keyword)) return `${region} ${keyword} ${department}`;
    if (keyword) return `${region} ${keyword}`;
    return `${region} ${department || '병원'}`;
  }

  private isDirectHospitalName(keyword: string): boolean {
    return /병원|의원|클리닉|센터|메디컬|한의원|치과/.test(keyword.replace(/\s+/g, ''));
  }

  private matchesDepartment(item: Record<string, string>, department: string): boolean {
    const source = `${item.place_name || ''} ${item.category_name || ''}`.replace(/\s+/g, '');
    if (!department) return true;
    if (department === '소아청소년과') {
      return /소아청소년과|소아과|소아|키즈|어린이/.test(source);
    }
    if (department === '응급실') {
      return /응급실|응급의료센터|응급|권역응급|지역응급/.test(source);
    }
    return source.includes(department.replace(/\s+/g, ''));
  }

  private matchesRegion(item: Record<string, string>, region: string): boolean {
    const normalizedRegion = String(region || '').replace(/\s+/g, '');
    if (!normalizedRegion) return true;

    const address = `${item.road_address_name || ''} ${item.address_name || ''}`.replace(/\s+/g, '');
    const regionTokens = normalizedRegion.match(/[가-힣]+(?:시|군|구|읍|면|동|로|길)/g) || [];
    if (!regionTokens.length) return address.includes(normalizedRegion);

    return regionTokens.every((token) => address.includes(token));
  }

  private hasRegionScope(region: string): boolean {
    const normalizedRegion = String(region || '').replace(/\s+/g, '');
    return /[가-힣]+(?:시|군|구|읍|면|동)/.test(normalizedRegion);
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
