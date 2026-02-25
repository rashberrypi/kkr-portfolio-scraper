import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller('health')
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Check if API and Database are alive' })
  async checkHealth() {
    const dbStatus = this.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isDbUp = dbStatus === 1;

    return {
      status: isDbUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      details: {
        database: isDbUp ? 'connected' : 'disconnected',
        uptime: process.uptime(),
      },
    };
  }
}