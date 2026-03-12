import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { RecordEntity } from '../records/entities/record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
