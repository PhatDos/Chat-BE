import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { PrismaModule } from '~/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: 'temp-secret' }),
    PrismaModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, AuthGuard],
})
export class ProfileModule {}
