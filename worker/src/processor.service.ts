import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { RecordEntity, ProcessingStatus } from './entities/record.entity';

@Injectable()
export class ProcessorService implements OnModuleInit {
  private readonly logger = new Logger(ProcessorService.name);
  private sqsClient: SQSClient;
  private s3Client: S3Client;
  private queueUrl: string;
  private isProcessing = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(RecordEntity)
    private recordsRepository: Repository<RecordEntity>,
  ) {
    const isLocal = this.configService.get<string>('NODE_ENV') !== 'production';

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: isLocal ? 'http://localhost:4566' : undefined,
    });

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: isLocal ? 'http://localhost:4566' : undefined,
      forcePathStyle: isLocal,
    });

    this.queueUrl = this.configService.get<string>(
      'SQS_QUEUE_URL',
      'http://localhost:4566/000000000000/fileflow-processing-queue'
    );
  }

  async onModuleInit() {
    this.logger.log('Worker starting - polling SQS queue for messages...');
    this.startPolling();
  }

  private async startPolling() {
    while (true) {
      try {
        await this.pollMessages();
      } catch (error) {
        this.logger.error('Error in polling loop', error.stack);
        await this.sleep(5000);
      }
    }
  }

  private async pollMessages() {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 300,
    });

    const response = await this.sqsClient.send(command);

    if (!response.Messages || response.Messages.length === 0) {
      return;
    }

    for (const message of response.Messages) {
      try {
        await this.processMessage(message);

        await this.sqsClient.send(new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }));

        this.logger.log(`Message processed and deleted: ${message.MessageId}`);
      } catch (error) {
        this.logger.error(`Failed to process message ${message.MessageId}`, error.stack);
      }
    }
  }

  private async processMessage(message: any) {
    const body = JSON.parse(message.Body);
    this.logger.log(`Processing message for record: ${body.recordId}`);

    const record = await this.recordsRepository.findOne({
      where: { id: body.recordId },
    });

    if (!record) {
      this.logger.error(`Record not found: ${body.recordId}`);
      return;
    }

    record.processing_status = ProcessingStatus.PROCESSING;
    await this.recordsRepository.save(record);

    try {
      const metadata = await this.extractMetadata(body.fileKey);

      record.processing_status = ProcessingStatus.COMPLETED;
      record.processing_metadata = metadata;
      record.processing_error = '';
      await this.recordsRepository.save(record);

      this.logger.log(`Successfully processed record: ${body.recordId}`);
    } catch (error) {
      record.processing_status = ProcessingStatus.FAILED;
      record.processing_error = error.message;
      await this.recordsRepository.save(record);

      this.logger.error(`Failed to process record: ${body.recordId}`, error.stack);
    }
  }

  private async extractMetadata(fileKey: string): Promise<any> {
    await this.sleep(2000);

    try {
      const bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'fileflow-uploads-local');
      
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(headCommand);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        processingTimestamp: new Date().toISOString(),
        processingType: 'metadata_extraction',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch S3 metadata for ${fileKey}`, error.stack);
      return {
        processingTimestamp: new Date().toISOString(),
        processingType: 'metadata_extraction',
        error: 'Failed to fetch S3 metadata',
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
