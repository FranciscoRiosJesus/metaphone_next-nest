import { Module } from '@nestjs/common';
import { AthletesModule } from './athletes/athletes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AthletesModule],
})
export class AppModule {}
