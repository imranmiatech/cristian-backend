import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) { }

  // onModuleInit() {
  //   const redisUrl =
  //     this.configService.get<string>('redis.url') ||
  //     `redis://${this.configService.get<string>('redis.host') || 'localhost'}:${this.configService.get<number>('redis.port') || 6379}`;

  //   this.redis = new Redis(redisUrl);
  // }
  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    const host = this.configService.get<string>('redis.host');
    const port = this.configService.get<number>('redis.port');

    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      this.redis = new Redis({ host, port });
    }

    this.redis.on('connect', () => {
      console.log(` Redis Connected via ${redisUrl ? 'URL' : host + ':' + port}`);
    });

    this.redis.on('error', (err) => {
      console.error(' Redis Connection Error:', err.message);
    });
  }
  // --- Basic Key-Value Operations ---

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  // --- Hash Operations (Keeping your original names) ---

  async hSet(hash: string, key: string, value: string) {
    await this.redis.hset(hash, key, value);
  }

  async hGet(hash: string, key: string) {
    return this.redis.hget(hash, key);
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
    return result === 1;
  }
}

