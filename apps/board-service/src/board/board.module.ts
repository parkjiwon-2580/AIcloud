import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestUserService } from '../request-user.service';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController],
  providers: [BoardService, RequestUserService],
})
export class BoardModule {}
