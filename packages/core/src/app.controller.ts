/**
 * App Controller - Health & Root Endpoints
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get('health')
    @ApiOperation({
        summary: 'Health Check',
        description: 'Returns the health status of the API server',
    })
    @ApiResponse({
        status: 200,
        description: 'Server is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                service: { type: 'string', example: 'apex-core' },
                timestamp: { type: 'string', example: '2026-01-15T10:00:00Z' },
                version: { type: 'string', example: '0.0.1' },
            },
        },
    })
    healthCheck() {
        return this.appService.getHealth();
    }
}
