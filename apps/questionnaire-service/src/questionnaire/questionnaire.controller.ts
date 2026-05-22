import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { QuestionnaireService }
  from './questionnaire.service';

import { CreateQuestionnaireDto }
  from './dto/create-questionnaire.dto';

@Controller('questionnaires')
export class QuestionnaireController {

  constructor(
    private readonly questionnaireService:
      QuestionnaireService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateQuestionnaireDto,
  ) {

    return this
  .questionnaireService
  .create(dto);
  }
}