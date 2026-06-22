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

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const MODERN_JAMO_TO_COMPATIBILITY: Record<string, string> = {
  ᄀ: 'ㄱ',
  ᄁ: 'ㄲ',
  ᄂ: 'ㄴ',
  ᄃ: 'ㄷ',
  ᄄ: 'ㄸ',
  ᄅ: 'ㄹ',
  ᄆ: 'ㅁ',
  ᄇ: 'ㅂ',
  ᄈ: 'ㅃ',
  ᄉ: 'ㅅ',
  ᄊ: 'ㅆ',
  ᄋ: 'ㅇ',
  ᄌ: 'ㅈ',
  ᄍ: 'ㅉ',
  ᄎ: 'ㅊ',
  ᄏ: 'ㅋ',
  ᄐ: 'ㅌ',
  ᄑ: 'ㅍ',
  ᄒ: 'ㅎ',
  ᅡ: 'ㅏ',
  ᅢ: 'ㅐ',
  ᅣ: 'ㅑ',
  ᅤ: 'ㅒ',
  ᅥ: 'ㅓ',
  ᅦ: 'ㅔ',
  ᅧ: 'ㅕ',
  ᅨ: 'ㅖ',
  ᅩ: 'ㅗ',
  ᅪ: 'ㅘ',
  ᅫ: 'ㅙ',
  ᅬ: 'ㅚ',
  ᅭ: 'ㅛ',
  ᅮ: 'ㅜ',
  ᅯ: 'ㅝ',
  ᅰ: 'ㅞ',
  ᅱ: 'ㅟ',
  ᅲ: 'ㅠ',
  ᅳ: 'ㅡ',
  ᅴ: 'ㅢ',
  ᅵ: 'ㅣ',
  ᆨ: 'ㄱ',
  ᆩ: 'ㄲ',
  ᆪ: 'ㄳ',
  ᆫ: 'ㄴ',
  ᆬ: 'ㄵ',
  ᆭ: 'ㄶ',
  ᆮ: 'ㄷ',
  ᆯ: 'ㄹ',
  ᆰ: 'ㄺ',
  ᆱ: 'ㄻ',
  ᆲ: 'ㄼ',
  ᆳ: 'ㄽ',
  ᆴ: 'ㄾ',
  ᆵ: 'ㄿ',
  ᆶ: 'ㅀ',
  ᆷ: 'ㅁ',
  ᆸ: 'ㅂ',
  ᆹ: 'ㅄ',
  ᆺ: 'ㅅ',
  ᆻ: 'ㅆ',
  ᆼ: 'ㅇ',
  ᆽ: 'ㅈ',
  ᆾ: 'ㅊ',
  ᆿ: 'ㅋ',
  ᇀ: 'ㅌ',
  ᇁ: 'ㅍ',
  ᇂ: 'ㅎ',
};

const DEPARTMENT_ALIASES: Array<{ department: string; aliases: string[] }> = [
  {
    department: '소아청소년과',
    aliases: ['소아청소년과', '소아과', '소청과', '소아', '아기', '아이', '영유아', '어린이', '키즈'],
  },
  {
    department: '이비인후과',
    aliases: ['이비인후과', '이비인후', '이빈후과', '귀', '코', '목', '중이염', '비염'],
  },
  {
    department: '피부과',
    aliases: ['피부과', '피부', '발진', '두드러기', '아토피'],
  },
  {
    department: '응급실',
    aliases: ['응급실', '응급', '야간', '심야', '응급의료센터'],
  },
];

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  async recommend(department = '소아청소년과', region = '서울', keyword = ''): Promise<HospitalRecommendation[]> {
    const normalizedKeyword = this.normalizeKeyword(keyword);
    const normalizedDepartment = this.normalizeDepartment(`${department} ${normalizedKeyword}`) || normalizedKeyword || department;
    const apiKey = readEnv('MAP_API_KEY');
    const provider = readEnv('MAP_API_PROVIDER', apiKey ? 'kakao' : 'mock');
    if (provider === 'kakao' && apiKey) {
      try {
        const hospitals = await this.searchKakao(department, region, keyword, apiKey);
        if (hospitals.length) return hospitals;
        this.logger.warn(`Kakao hospital search returned no results. Falling back to mock recommendations. region=${region}, department=${department}, keyword=${keyword}`);
      } catch (error) {
        this.logger.warn(`Kakao hospital search failed. Falling back to mock recommendations. ${this.errorMessage(error)}`);
      }
    }
    this.logger.log('MAP_API_KEY is empty or MAP_API_PROVIDER=mock. Returning mock hospital recommendations.');
    return this.mockRecommendations(normalizedDepartment, region);
  }

  private async searchKakao(
    department: string,
    region: string,
    keyword: string,
    apiKey: string,
  ): Promise<HospitalRecommendation[]> {
    const baseUrl = readEnv('MAP_API_BASE_URL', 'https://dapi.kakao.com');
    const timeout = readNumberEnv('MAP_API_TIMEOUT_MS', 3000);
    const normalizedKeyword = this.normalizeKeyword(keyword);
    const normalizedDepartment = this.normalizeDepartment(`${department} ${normalizedKeyword}`);
    const directNameSearch = this.isDirectHospitalName(normalizedKeyword);
    const query = this.buildKakaoQuery(region, normalizedDepartment, normalizedKeyword);
    const documents = await this.searchKakaoDocuments(baseUrl, apiKey, timeout, query, true);
    const fallbackDocuments = documents.length
      ? documents
      : await this.searchKakaoDocuments(baseUrl, apiKey, timeout, query, false);
    const regionMatched = documents.filter((item) => this.matchesRegion(item, region));
    const hasRegionScope = this.hasRegionScope(region);
    const scopedDocuments = hasRegionScope && regionMatched.length ? regionMatched : fallbackDocuments;
    const filtered = directNameSearch
      ? scopedDocuments
      : scopedDocuments.filter((item) => this.matchesDepartment(item, normalizedDepartment || normalizedKeyword));
    const results = this.fillResults(filtered, scopedDocuments, 5);

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

  private fillResults(
    primary: Array<Record<string, string>>,
    fallback: Array<Record<string, string>>,
    limit: number,
  ): Array<Record<string, string>> {
    const seen = new Set<string>();
    const results: Array<Record<string, string>> = [];

    for (const item of [...primary, ...fallback]) {
      const key = item.id || item.place_url || `${item.place_name}|${item.road_address_name || item.address_name}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if (results.length >= limit) break;
    }

    return results;
  }

  private async searchKakaoDocuments(
    baseUrl: string,
    apiKey: string,
    timeout: number,
    query: string,
    hospitalCategoryOnly: boolean,
  ): Promise<Array<Record<string, string>>> {
    const response = await axios.get(`${baseUrl}/v2/local/search/keyword.json`, {
      params: {
        query,
        ...(hospitalCategoryOnly ? { category_group_code: 'HP8' } : {}),
        size: 10,
      },
      headers: { Authorization: `KakaoAK ${apiKey}` },
      timeout,
    });

    return (response.data.documents ?? []) as Array<Record<string, string>>;
  }

  private errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const bodyMessage = error.response?.data?.message || error.response?.data?.error;
      return [status ? `status=${status}` : '', bodyMessage || error.message].filter(Boolean).join(' ');
    }
    return error instanceof Error ? error.message : String(error);
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
    const value = String(department || '').normalize('NFKC').replace(/\s+/g, '');
    if (!value || value === '전체' || value === '전체병원') return '';
    const matchedDepartment = DEPARTMENT_ALIASES.find(({ aliases }) =>
      aliases.some((alias) => this.matchesKoreanSearch(value, alias)),
    );
    if (matchedDepartment) return matchedDepartment.department;
    return department || '';
  }

  private normalizeKeyword(keyword: string): string {
    const value = String(keyword || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    return this.normalizeDepartment(value) || value;
  }

  private buildKakaoQuery(region: string, department: string, keyword: string): string {
    if (keyword && department && !this.isDirectHospitalName(keyword)) return `${region} ${department}`;
    if (keyword) return `${region} ${keyword}`;
    return `${region} ${department || '병원'}`;
  }

  private isDirectHospitalName(keyword: string): boolean {
    const value = keyword.replace(/\s+/g, '');
    return /병원|의원|클리닉|센터|메디컬|한의원|치과/.test(value) || this.matchesKoreanSearch(value, '병원');
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
    return this.matchesKoreanSearch(source, department);
  }

  private matchesRegion(item: Record<string, string>, region: string): boolean {
    const normalizedRegion = String(region || '').replace(/\s+/g, '');
    if (!normalizedRegion) return true;

    const address = `${item.road_address_name || ''} ${item.address_name || ''}`.replace(/\s+/g, '');
    const regionTokens = normalizedRegion.match(/[가-힣]+(?:시|군|구|읍|면|동|로|길)/g) || [];
    if (!regionTokens.length) return this.matchesKoreanSearch(address, normalizedRegion);

    return regionTokens.every((token) => this.matchesKoreanSearch(address, token));
  }

  private hasRegionScope(region: string): boolean {
    const normalizedRegion = String(region || '').replace(/\s+/g, '');
    return /[가-힣]+(?:시|군|구|읍|면|동)/.test(normalizedRegion) || /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(normalizedRegion);
  }

  private matchesKoreanSearch(source: string, query: string): boolean {
    const sourceInfo = this.koreanSearchInfo(source);
    const queryInfo = this.koreanSearchInfo(query);
    if (!sourceInfo.compact || !queryInfo.compact) return false;
    if (sourceInfo.compact.includes(queryInfo.compact) || queryInfo.compact.includes(sourceInfo.compact)) return true;

    const jamoNeedle = sourceInfo.hasStandaloneJamo ? sourceInfo.compact : queryInfo.hasStandaloneJamo ? queryInfo.compact : '';
    const hangulInfo = sourceInfo.hasStandaloneJamo ? queryInfo : sourceInfo;
    if (!jamoNeedle) return false;

    return hangulInfo.initials.includes(jamoNeedle) || hangulInfo.jamo.includes(jamoNeedle);
  }

  private koreanSearchInfo(value: string): { compact: string; initials: string; jamo: string; hasStandaloneJamo: boolean } {
    const compact = String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ᄀ-ᇂ]/g, (char) => MODERN_JAMO_TO_COMPATIBILITY[char] || char)
      .replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');

    return {
      compact,
      initials: this.toInitialConsonants(compact),
      jamo: this.toCompatibilityJamo(compact),
      hasStandaloneJamo: /[ㄱ-ㅎㅏ-ㅣ]/.test(compact),
    };
  }

  private toInitialConsonants(value: string): string {
    return [...value]
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code < HANGUL_BASE || code > HANGUL_END) return char;
        const index = code - HANGUL_BASE;
        return CHO[Math.floor(index / (JUNG_COUNT * JONG_COUNT))];
      })
      .join('');
  }

  private toCompatibilityJamo(value: string): string {
    return [...value]
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code < HANGUL_BASE || code > HANGUL_END) return char;
        const index = code - HANGUL_BASE;
        const cho = Math.floor(index / (JUNG_COUNT * JONG_COUNT));
        const jung = Math.floor((index % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
        const jong = index % JONG_COUNT;
        return `${CHO[cho]}${JUNG[jung]}${JONG[jong]}`;
      })
      .join('');
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
      {
        name: '맑은숨 이비인후과의원',
        distance: '3.1km',
        openingHours: '09:00-18:30',
        isOpen: true,
        address: `${region} 숨편한길 18`,
        department,
      },
      {
        name: '365 아이응급의료센터',
        distance: '3.7km',
        openingHours: '24시간 진료',
        isOpen: true,
        address: `${region} 안심로 119`,
        department,
      },
    ];
  }
}
