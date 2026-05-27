import { Module } from '@nestjs/common';
import { BoardModule } from './board/board.module';
import { HealthController } from './health.controller';

@Module({
  imports: [BoardModule],
  controllers: [HealthController],
})
export class AppModule {}
