import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KiwiService {
  async analyze(text: string) {
    const response = await axios.post(
      `${process.env.KIWI_URL}/analyze`,
      {
        text,
      },
    );

    return response.data;
  }
}