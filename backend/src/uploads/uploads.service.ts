import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordEntity, ProcessingStatus } from '../records/entities/record.entity';
import { PresignRequestDto, UploadCompleteDto } from './dto/upload.dto';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    @InjectRepository(RecordEntity)
    private recordsRepository: Repository<RecordEntity>,
  ) {
    const isLocal = this.configService.get<string>('NODE_ENV') !== 'production';

    // AWS Clients
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: isLocal ? 'http://localhost:4566' : undefined,
      forcePathStyle: isLocal,
    });

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: isLocal ? 'http://localhost:4566' : undefined,
    });

    // Redis Client
    this.redis = new Redis(this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  async generatePresignedUrl(presignDto: PresignRequestDto, userId: string) {
    try {
      if (!ALLOWED_MIME_TYPES.includes(presignDto.fileType)) {
        throw new BadRequestException('Invalid file type');
      }

      const record = await this.recordsRepository.findOne({
        where: { id: presignDto.recordId, owner: { id: userId } },
      });

      if (!record) {
        throw new NotFoundException('Record not found');
      }

      const bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'fileflow-uploads-local');
      const timestamp = Date.now();
      const cleanFileName = presignDto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `uploads/${userId}/${timestamp}/${cleanFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: presignDto.fileType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

      this.logger.log(`Generated presigned URL for record ${presignDto.recordId} by user ${userId}`);

      return {
        uploadUrl,
        fileKey,
        expiresIn: 300,
      };
    } catch (error) {
      this.logger.error(`Error generating presigned URL for user ${userId}`, error.stack);
      throw error;
    }
  }

  async completeUpload(completeDto: UploadCompleteDto, userId: string) {
    try {
      const record = await this.recordsRepository.findOne({
        where: { id: completeDto.recordId, owner: { id: userId } },
      });

      if (!record) {
        throw new NotFoundException('Record not found');
      }

      // 1. Update record
      record.file_key = completeDto.fileKey;
      record.file_name = completeDto.fileName;
      record.file_size = completeDto.fileSize;
      record.processing_status = ProcessingStatus.PENDING;
      await this.recordsRepository.save(record);

      // 2. Publish SQS Message
      const queueUrl = this.configService.get<string>('SQS_QUEUE_URL', 'http://localhost:4566/000000000000/fileflow-processing-queue');
      const message = {
        recordId: record.id,
        fileKey: record.file_key,
        fileName: record.file_name,
        uploadedBy: userId,
        requestedAt: new Date().toISOString(),
        processingType: 'metadata_extraction'
      };

      await this.sqsClient.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      }));

      // 3. Invalidate Redis Cache
      await this.redis.del(`dashboard:summary:${userId}`);

      this.logger.log(`Completed upload for record ${completeDto.recordId} by user ${userId}. SQS message published.`);

      return {
        success: true,
        message: 'Upload completed and processing started.',
        record
      };
    } catch (error) {
      this.logger.error(`Error completing upload for record ${completeDto.recordId} and user ${userId}`, error.stack);
      throw error;
    }
  }
}
