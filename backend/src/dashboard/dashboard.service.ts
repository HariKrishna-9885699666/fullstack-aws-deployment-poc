import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordEntity, RecordStatus, ProcessingStatus } from '../records/entities/record.entity';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    @InjectRepository(RecordEntity)
    private recordsRepository: Repository<RecordEntity>,
  ) {
    this.redis = new Redis(this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  async getSummary(userId: string) {
    try {
      const cacheKey = `dashboard:summary:${userId}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const totalRecords = await this.recordsRepository.count({ where: { owner: { id: userId } } });

      const newCount = await this.recordsRepository.count({ where: { owner: { id: userId }, status: RecordStatus.NEW } });
      const inProgressCount = await this.recordsRepository.count({ where: { owner: { id: userId }, status: RecordStatus.IN_PROGRESS } });
      const doneCount = await this.recordsRepository.count({ where: { owner: { id: userId }, status: RecordStatus.DONE } });

      const pendingCount = await this.recordsRepository.count({ where: { owner: { id: userId }, processing_status: ProcessingStatus.PENDING } });
      const processingCount = await this.recordsRepository.count({ where: { owner: { id: userId }, processing_status: ProcessingStatus.PROCESSING } });
      const completedCount = await this.recordsRepository.count({ where: { owner: { id: userId }, processing_status: ProcessingStatus.COMPLETED } });
      const failedCount = await this.recordsRepository.count({ where: { owner: { id: userId }, processing_status: ProcessingStatus.FAILED } });

      const recentRecords = await this.recordsRepository.find({
        where: { owner: { id: userId } },
        order: { created_at: 'DESC' },
        take: 10,
      });

      const summary = {
        totalRecords,
        byStatus: {
          NEW: newCount,
          IN_PROGRESS: inProgressCount,
          DONE: doneCount,
        },
        byProcessingStatus: {
          PENDING: pendingCount,
          PROCESSING: processingCount,
          COMPLETED: completedCount,
          FAILED: failedCount,
        },
        recentRecords,
      };

      await this.redis.set(cacheKey, JSON.stringify(summary), 'EX', 60);

      this.logger.log(`Dashboard summary computed and cached for user: ${userId}`);
      return summary;
    } catch (error) {
       this.logger.error(`Error generating dashboard summary for user: ${userId}`, error.stack);
       throw error;
    }
  }
}
