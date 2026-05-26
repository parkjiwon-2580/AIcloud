import { Module } from '@nestjs/common';
import { HospitalModule } from './hospital/hospital.module';

@Module({
  imports: [HospitalModule],
})
export class AppModule {}
