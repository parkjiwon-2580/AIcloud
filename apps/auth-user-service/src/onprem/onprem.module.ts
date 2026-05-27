import { Module } from '@nestjs/common';
import { OnpremService } from './onprem.service';

@Module({
  providers: [OnpremService],
  exports: [OnpremService],
})
export class OnpremModule {}
