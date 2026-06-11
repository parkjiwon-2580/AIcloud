import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KiwiService {
  async analyze(text: string) {
    if (!process.env.KIWI_URL) {
      return {
        mode: 'local-fallback',
        tokens: this.tokenize(text),
      };
    }

    const response = await axios.post(
      `${process.env.KIWI_URL}/analyze`,
      {
        text,
      },
    );

    return response.data;
  }

  private tokenize(text: string) {
    return text
      .replace(/[{}[\]":,]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
      .slice(0, 80);
  }
}
