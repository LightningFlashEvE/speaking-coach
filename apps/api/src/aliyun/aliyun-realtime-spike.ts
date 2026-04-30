/**
 * Aliyun Bailian Realtime — backend-only connection spike
 *
 * Run with:
 *   pnpm --filter api aliyun:spike
 *
 * What it does:
 *   1. Connects to Aliyun Bailian Realtime WebSocket
 *   2. Sends a text event (no audio, no frontend)
 *   3. Receives and logs all response events
 *   4. Prints the summary and exits
 *
 * Prerequisites:
 *   ALIYUN_DASHSCOPE_API_KEY must be set in .env
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AliyunBailianRealtimeProvider } from './aliyun-bailian-realtime.provider';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const provider = app.get(AliyunBailianRealtimeProvider);

    console.log('\n─────────────────────────────────────────');
    console.log('  Aliyun Bailian Realtime — Spike Test');
    console.log('─────────────────────────────────────────\n');

    const result = await provider.runTextConnectionSpike({
      text: 'Hello! I am practicing English at the airport. Can you play the role of an immigration officer?',
      timeoutMs: 30000,
    });

    console.log('\n─────────────────────────────────────────');
    console.log('  Spike Result');
    console.log('─────────────────────────────────────────');
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
    console.log('─────────────────────────────────────────\n');

    if (result.connected && result.assistantText) {
      console.log(
        '✅ Spike PASSED — Aliyun Bailian Realtime is reachable and responding.\n',
      );
    } else {
      console.log('⚠️  Spike completed but no assistant text was received.\n');
    }
  } catch (error) {
    console.error(
      '\n❌ Spike FAILED:',
      error instanceof Error ? error.message : String(error),
      '\n',
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
