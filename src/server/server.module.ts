import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { PrismaModule } from '~/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: 'temp-secret' }),
    PrismaModule,
  ],
  controllers: [ServerController],
  providers: [ServerService, AuthGuard],
})
export class ServerModule {}
