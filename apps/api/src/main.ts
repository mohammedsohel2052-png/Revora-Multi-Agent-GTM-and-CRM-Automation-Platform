import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('RevoraBootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Revora GTM Intelligence OS API')
    .setDescription('Multi-Agent GTM and CRM Automation Engine REST API')
    .setVersion('1.0')
    .addTag('tenants', 'Multi-tenant workspace operations')
    .addTag('crm', 'Lead, contact, company, and pipeline operations')
    .addTag('agents', 'Agent swarm control, prompt execution, and safety')
    .addTag('approvals', 'Human-in-the-loop approval workflows')
    .addTag('audit', 'Immutable audit trail and compliance verification')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] || 4000;
  await app.listen(port);
  logger.log(`🚀 Revora API engine running on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
