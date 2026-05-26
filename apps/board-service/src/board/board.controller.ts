import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardPostDto } from './dto/board.dto';

@Controller('info')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get('posts')
  list(@Query('q') q?: string) {
    return this.boardService.list(q);
  }

  @Get('posts/:id')
  detail(@Param('id') id: string) {
    return this.boardService.detail(id);
  }

  @Post('posts')
  create(@Headers('authorization') authorization: string | undefined, @Body() dto: BoardPostDto) {
    return this.boardService.create(dto, authorization);
  }

  @Patch('posts/:id')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() dto: BoardPostDto,
  ) {
    return this.boardService.update(id, dto, authorization);
  }

  @Delete('posts/:id')
  remove(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.boardService.remove(id, authorization);
  }
}
