import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';

import { MessageModule } from '~/message/message.module';
import { ServerModule } from '~/server/server.module';

@Module({
  imports: [
    JwtModule.register({ secret: 'temp-secret' }), // For decoding only
    PrismaModule,
    MessageModule,
    ServerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
