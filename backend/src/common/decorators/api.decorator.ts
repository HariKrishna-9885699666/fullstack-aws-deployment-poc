import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

export function ApiDoc(options: {
  summary: string;
  responseType?: any;
  status?: number;
  auth?: boolean;
}) {
  const decorators = [
    ApiOperation({ summary: options.summary }),
    ApiResponse({ 
      status: options.status || 200, 
      type: options.responseType,
      description: options.responseType ? `Returns ${options.responseType.name}` : 'Success'
    }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  ];

  if (options.auth !== false) {
    decorators.push(ApiBearerAuth());
    decorators.push(ApiResponse({ status: 401, description: 'Unauthorized' }));
  }

  return applyDecorators(...decorators);
}
