import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { RecordStatus } from '../entities/record.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecordDto {
  @ApiProperty({ example: 'Quarterly Report' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Financial report for Q3' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRecordDto {
  @ApiPropertyOptional({ example: 'Updated Report' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: RecordStatus, example: RecordStatus.IN_PROGRESS })
  @IsEnum(RecordStatus)
  @IsOptional()
  status?: RecordStatus;
}
