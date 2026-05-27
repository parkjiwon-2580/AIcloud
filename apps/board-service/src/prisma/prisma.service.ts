import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaService {
  [model: string]: any;

  boardPost = this.disabledDelegate('boardPost');

  // Prisma is intentionally disabled on the practice branch so CI can build
  // without requiring DATABASE_URL or a reachable database.
  async $connect() {
    return undefined;
  }

  async $disconnect() {
    return undefined;
  }

  private disabledDelegate(modelName: string): any {
    return new Proxy({}, {
      get: (_target, operation) => {
        if (operation === 'then') {
          return undefined;
        }
        return async () => {
          throw new Error(`Prisma is disabled for CI practice branch: ${modelName}.${String(operation)}`);
        };
      },
    });
  }
}
