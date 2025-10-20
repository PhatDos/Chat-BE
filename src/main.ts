import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './validaion.pipe'; // file custom
import { NestExpressApplication } from '@nestjs/platform-express';
import * as qs from 'qs'; // ✅ Thêm dòng này

declare const module: any;

async function bootstrap() {
  // ✅ Khai báo rõ là dùng Express (để dùng được app.set)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Cấu hình parser nâng cao cho query
  app.set('query parser', (str: string) => qs.parse(str));

  // ✅ Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // loại bỏ field không có trong DTO
      forbidNonWhitelisted: true, // có field thừa -> báo lỗi và không thực thi logic
      transform: true, // tự động ép kiểu (string -> number)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
