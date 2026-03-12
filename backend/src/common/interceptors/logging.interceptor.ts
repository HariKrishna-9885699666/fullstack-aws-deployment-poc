import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    this.logger.log(`Incoming request: ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`);

    return next
      .handle()
      .pipe(
        tap(() => 
          this.logger.log(`Outgoing response: ${method} ${url} - Status: ${context.switchToHttp().getResponse().statusCode} - ${Date.now() - now}ms`)
        ),
      );
  }
}
