import { Module } from '@nestjs/common';
import { OnpremModule } from '../onprem/onprem.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [OnpremModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
