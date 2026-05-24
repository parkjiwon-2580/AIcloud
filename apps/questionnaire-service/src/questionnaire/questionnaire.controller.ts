import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';

@Controller('questionnaires')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post()
  create(
    @Body() dto: CreateQuestionnaireDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.questionnaireService.create(dto, authorization);
  }

  @Get('history')
  history(
    @Headers('authorization') authorization: string | undefined,
    @Query('childId') childId?: string,
  ) {
    return this.questionnaireService.history(authorization, childId);
  }

  @Get(':id/result')
  result(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.questionnaireService.result(id, authorization);
  }
}
