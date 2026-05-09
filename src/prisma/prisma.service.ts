
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';

import pkg from 'pg';
import { PrismaClient } from 'prisma/generated/prisma/client';
const { Pool } = pkg;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: pkg.Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isSSL = connectionString?.includes('sslmode=require') || connectionString?.includes('.neon.tech');

    const pool = new Pool({
      connectionString,
      ...(isSSL && { ssl: { rejectUnauthorized: false } }),
    });
    const adapter = new PrismaPg(pool);


    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}