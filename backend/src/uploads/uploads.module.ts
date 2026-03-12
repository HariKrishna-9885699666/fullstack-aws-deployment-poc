import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { RecordEntity } from '../records/entities/record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity])],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
