import { NestFactory } from '@nestjs/core';
import { Server as HttpServer } from 'http';
import { AppModule } from './app.module';
import { VoiceSessionService } from './voice-session/voice-session.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
  });

  const voiceSessionService = app.get(VoiceSessionService);

  const port = process.env.PORT ?? 7539;
  await app.listen(port);
  const server = app.getHttpServer() as HttpServer;
  console.log(`Server is running on http://localhost:${port}`);

  voiceSessionService.initialize(server);
}
void bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
