import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordEntity } from './records/entities/record.entity';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Controller()
export class AppController {
  private redis: Redis;

  constructor(
    @InjectRepository(RecordEntity)
    private recordsRepository: Repository<RecordEntity>,
    private configService: ConfigService,
  ) {
    this.redis = new Redis(this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReady() {
    try {
      // Check DB
      await this.recordsRepository.query('SELECT 1');
      // Check Redis
      await this.redis.ping();
      
      return { status: 'ok', db: 'connected', redis: 'connected' };
    } catch (error) {
      throw new Error('Service Unavailable');
    }
  }
}
