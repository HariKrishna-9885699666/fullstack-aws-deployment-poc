import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto, UpdateRecordDto } from './dto/record.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiDoc } from '../common/decorators/api.decorator';

@ApiTags('Records')
@UseGuards(AuthGuard('jwt'))
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @ApiDoc({ summary: 'Create a new record', auth: true })
  @Post()
  create(@Body() createRecordDto: CreateRecordDto, @Request() req: any) {
    return this.recordsService.create(createRecordDto, req.user.userId);
  }

  @ApiDoc({ summary: 'Get all records with pagination and filtering', auth: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.recordsService.findAll(req.user.userId, page, limit, status);
  }

  @ApiDoc({ summary: 'Get a single record by ID', auth: true })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.recordsService.findOne(id, req.user.userId);
  }

  @ApiDoc({ summary: 'Update a record', auth: true })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecordDto: UpdateRecordDto, @Request() req: any) {
    return this.recordsService.update(id, updateRecordDto, req.user.userId);
  }

  @ApiDoc({ summary: 'Delete a record', auth: true })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.recordsService.remove(id, req.user.userId);
  }
}
