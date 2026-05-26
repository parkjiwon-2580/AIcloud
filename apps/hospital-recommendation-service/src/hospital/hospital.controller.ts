import { Controller, Get, Query } from '@nestjs/common';
import { HospitalService } from './hospital.service';

@Controller()
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  @Get('hospitals/recommend')
  recommend(@Query('department') department?: string, @Query('region') region?: string) {
    return this.hospitalService.recommend(department, region);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'hospital-recommendation-service' };
  }
}
