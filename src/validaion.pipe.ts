import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

interface ValidationPipeOptions {
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  transform?: boolean;
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  constructor(private options: ValidationPipeOptions = {}) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    // ✅ ép kiểu nếu transform = true
    if (this.options.transform && metatype && typeof metatype === 'function') {
      value = plainToInstance(metatype, value);
    }

    // ✅ bỏ qua validate nếu kiểu primitive
    if (!metatype || this.isPrimitive(metatype)) return value;

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException({
        statusCode: 400,
        message: `Validation failed: ${messages}`,
        error: 'Bad Request',
      });
    }

    // ✅ whitelist: loại field không có trong DTO
    if (this.options.whitelist) {
      const dtoProps = Object.keys(object);
      Object.keys(value).forEach((key) => {
        if (!dtoProps.includes(key)) delete value[key];
      });
    }

    return value;
  }

  private isPrimitive(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return types.includes(metatype);
  }
}
