import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRecordDto, UpdateRecordDto } from './dto/record.dto';
import { RecordEntity, RecordStatus } from './entities/record.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);
  constructor(
    @InjectRepository(RecordEntity)
    private recordsRepository: Repository<RecordEntity>,
  ) {}

  async create(createRecordDto: CreateRecordDto, userId: string) {
    try {
      const record = this.recordsRepository.create({
        ...createRecordDto,
        owner: { id: userId },
      });
      const savedRecord = await this.recordsRepository.save(record);
      this.logger.log(`Record created successfully: ${savedRecord.id} by user: ${userId}`);
      return savedRecord;
    } catch (error) {
      this.logger.error(`Failed to create record for user: ${userId}`, error.stack);
      throw error;
    }
  }

  async findAll(userId: string, page: number = 1, limit: number = 10, status?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const query = this.recordsRepository.createQueryBuilder('record')
        .where('record.owner_id = :userId', { userId });

      if (status) {
        query.andWhere('record.status = :status', { status });
      }

      query.orderBy('record.created_at', 'DESC')
           .skip(skip)
           .take(limit);

      const [items, total] = await query.getManyAndCount();

      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
       this.logger.error(`Failed to fetch records for user: ${userId}`, error.stack);
       throw error;
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const record = await this.recordsRepository.findOne({
        where: { id, owner: { id: userId } },
      });
      
      if (!record) {
        this.logger.warn(`Record #${id} not found for user: ${userId}`);
        throw new NotFoundException(`Record #${id} not found`);
      }
      return record;
    } catch (error) {
      this.logger.error(`Failed to find record #${id} for user: ${userId}`, error?.stack);
      throw error;
    }
  }

  async update(id: string, updateRecordDto: UpdateRecordDto, userId: string) {
    try {
      const record = await this.findOne(id, userId);
      Object.assign(record, updateRecordDto);
      const updatedRecord = await this.recordsRepository.save(record);
      this.logger.log(`Record updated successfully: ${id} by user: ${userId}`);
      return updatedRecord;
    } catch (error) {
      this.logger.error(`Failed to update record #${id} for user: ${userId}`, error.stack);
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    try {
      const record = await this.findOne(id, userId);
      await this.recordsRepository.remove(record);
      this.logger.log(`Record deleted successfully: ${id} by user: ${userId}`);
      return { deleted: true, id };
    } catch (error) {
       this.logger.error(`Failed to delete record #${id} for user: ${userId}`, error.stack);
       throw error;
    }
  }
}
