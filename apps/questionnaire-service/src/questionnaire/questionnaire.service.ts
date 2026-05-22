import {
  Injectable,
} from '@nestjs/common';

import { randomUUID }
  from 'crypto';

import axios from 'axios';

import { CreateQuestionnaireDto }
  from './dto/create-questionnaire.dto';

@Injectable()
export class QuestionnaireService {

  async create(
    dto: CreateQuestionnaireDto,
  ) {

    const response =
      await axios.post(

        'http://localhost:9000/internal/sensitive/consultation',

        {

          consultation_id:
            randomUUID(),

          cloud_user_id:
            randomUUID(),

          raw_payload: {

            childId:
              dto.childId,

            symptomText:
              dto.symptomText,
          },
        },
      );

    return response.data;
  }
}