// email.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'email',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'redis_cache',
          port: configService.get<number>('redis.port') || 6379,
        },
      }),
    }),
  ],
  // ... providers and exports
})
export class EmailModule {}