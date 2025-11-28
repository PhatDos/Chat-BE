import { Module } from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import { DirectMessageController } from './direct-message.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DirectMessageGateway } from './direct-message.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [DirectMessageController],
  providers: [DirectMessageService, DirectMessageGateway],
})
export class DirectMessageModule {}
