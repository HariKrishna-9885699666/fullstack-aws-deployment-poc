import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.create(AppModule);
  
  logger.log('FileFlow Worker started and listening for SQS messages...');
  
  await app.init();
}
bootstrap();
