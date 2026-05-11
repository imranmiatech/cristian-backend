import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import { PrismaClient } from 'prisma/generated/prisma/client';
const { Pool } = pkg;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: pkg.Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
    
    const pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      max: 10,
    });
    
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;

    this.logger.log(`PrismaService initialized (Mode: ${isLocal ? 'Local' : 'Remote'})`);
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    try {
        await this.$connect();
        this.logger.log('Database connected successfully');
    } catch (error) {
        this.logger.error('Failed to connect to Database', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}