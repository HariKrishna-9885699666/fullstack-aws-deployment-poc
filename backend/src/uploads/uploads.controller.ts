import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PresignRequestDto, UploadCompleteDto } from './dto/upload.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { ApiDoc } from '../common/decorators/api.decorator';

@ApiTags('Uploads')
@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiDoc({ summary: 'Generate S3 Presigned URL', auth: true })
  @Post('presign')
  async presign(@Body() presignDto: PresignRequestDto, @Request() req: any) {
    return this.uploadsService.generatePresignedUrl(presignDto, req.user.userId);
  }

  @ApiDoc({ summary: 'Complete an S3 Upload and Publish to SQS', auth: true })
  @Post('complete')
  async complete(@Body() completeDto: UploadCompleteDto, @Request() req: any) {
    return this.uploadsService.completeUpload(completeDto, req.user.userId);
  }
}
