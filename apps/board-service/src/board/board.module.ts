import { Module } from '@nestjs/common';
import { RequestUserService } from '../request-user.service';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({
  controllers: [BoardController],
  providers: [BoardService, RequestUserService],
})
export class BoardModule {}
