import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VoiceSessionService } from './voice-session/voice-session.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const voiceSessionService = app.get(VoiceSessionService);

  const port = process.env.PORT ?? 7539;
  const server = await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);

  // Initialize WebSocket server
  voiceSessionService.initialize(server);
}
bootstrap();
