import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    const url = this.configService.get<string>('redis.upstash_rest_url');
    const token = this.configService.get<string>('redis.upstash_rest_token');

    if (url && token) {
      this.redis = new Redis({
        url: url,
        token: token,
      });
      console.log('🚀 Redis Connected via Upstash REST');
    } else {
      console.warn('⚠️ Upstash Redis REST credentials missing. RedisService might not work.');
    }
  }
  // --- Basic Key-Value Operations ---

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.redis.set(key, value, { ex: ttl });
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string) {
    return this.redis.get<string>(key);
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  // --- Hash Operations (Keeping your original names) ---

  async hSet(hash: string, key: string, value: string) {
    await this.redis.hset(hash, { [key]: value });
  }

  async hGet(hash: string, key: string) {
    return this.redis.hget<string>(hash, key);
  }

  async hDel(hash: string, key: string) {
    await this.redis.hdel(hash, key);
  }

  async hGetAll(hash: string) {
    return this.redis.hgetall(hash);
  }

  // --- Helper for Auth/Security ---

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result > 0;
  }
}

