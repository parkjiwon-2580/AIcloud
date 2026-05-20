import {
  Injectable,
} from '@nestjs/common';

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
            '550e8400-e29b-41d4-a716-446655440000',

          cloud_user_id:
            '123e4567-e89b-12d3-a456-426614174000',

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