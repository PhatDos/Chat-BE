import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import qs from 'qs';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for all origins (adjust for production)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.set('query parser', (str: string) => qs.parse(str));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      always: true,
    }),
  );

  const port = process.env.PORT ?? 3000;

  // Listen trên 0.0.0.0 để FE từ ngoài EC2 có thể connect
  await app.listen(port, '0.0.0.0');

  // Log IP public của server trực tiếp (hoặc hardcode nếu cần)
  console.log(`🚀 Application is running on: http://3.26.147.207:${port}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
