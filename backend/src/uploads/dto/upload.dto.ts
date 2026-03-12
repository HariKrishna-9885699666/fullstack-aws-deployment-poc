import { IsString, IsNotEmpty, IsNumber, Max, IsUUID, IsMimeType } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignRequestDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  recordId: string;

  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes (max 5MB)' })
  @IsNumber()
  @Max(5 * 1024 * 1024) // 5MB limit
  fileSize: number;
}

export class UploadCompleteDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  recordId: string;

  @ApiProperty({ example: 'uploads/abc/123/document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 1048576 })
  @IsNumber()
  fileSize: number;
}
