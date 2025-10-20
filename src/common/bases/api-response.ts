import { ApiResponseKey } from '../../enum/api-reponse-key.enum';
import { HttpStatus } from '@nestjs/common';
export class ApiResponse {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }
  static ok<T>(
    data: T,
    message: string = '',
    httpStatus: number = HttpStatus.OK,
  ): Record<string, unknown> {
    return {
      [ApiResponseKey.STATUS]: true,
      [ApiResponseKey.CODE]: httpStatus,
      [ApiResponseKey.DATA]: data,
      [ApiResponseKey.MESSAGE]: message,
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp(),
    };
  }

  static error<T>(
    error: T,
    message: string = '',
    httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ): Record<string, unknown> {
    return {
      [ApiResponseKey.STATUS]: false,
      [ApiResponseKey.CODE]: httpStatus,
      [ApiResponseKey.ERROR]: error,
      [ApiResponseKey.MESSAGE]: message,
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp(),
    };
  }

  static message(
    message: string,
    httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ): Record<string, unknown> {
    return {
      [ApiResponseKey.STATUS]: httpStatus === HttpStatus.OK ? true : false,
      [ApiResponseKey.CODE]: httpStatus,
      [ApiResponseKey.MESSAGE]: message,
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp(),
    };
  }
}
