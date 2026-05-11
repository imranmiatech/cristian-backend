import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import { PrismaClient } from 'prisma/generated/prisma/client';
const { Pool } = pkg;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: pkg.Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    const dbUrl = config.get<string>('database_url');
    const pool = new Pool({ 
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;

    if (!dbUrl) {
      this.logger.error('❌ DATABASE_URL is not defined in environment variables!');
    }

    const isLocal = dbUrl?.includes('localhost') || !dbUrl;
    this.logger.log(`PrismaService initialized (Mode: ${isLocal ? 'Local' : 'Remote'})`);
    
    if (!isLocal && dbUrl) {
      const host = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
      this.logger.log(`Connecting to remote database at: ${host}`);
    }
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