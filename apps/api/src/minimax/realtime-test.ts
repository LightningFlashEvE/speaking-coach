import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RealtimeTestService } from './realtime-test.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const service = app.get(RealtimeTestService);
    const result = await service.runTextOnlyTest();
    console.log(
      JSON.stringify(
        {
          connected: result.connected,
          receivedEventTypes: result.receivedEventTypes,
          assistantText: result.assistantText,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
