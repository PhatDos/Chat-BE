import { Global, Module } from '@nestjs/common';
import { RedisModule } from '~/redis/redis.module';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

@Global()
@Module({
  imports: [RedisModule],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
