import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    this.normalizeSqliteUrl();
    this.client = new PrismaClient();
  }

  get prisma() {
    return this.client;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  private normalizeSqliteUrl() {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./dev.db';
    }

    if (process.env.DATABASE_URL !== 'file:./dev.db') {
      return;
    }

    const devDbPath = resolve(__dirname, '..', '..', 'dev.db').replace(
      /\\/g,
      '/',
    );
    process.env.DATABASE_URL = `file:${devDbPath}`;
  }
}
