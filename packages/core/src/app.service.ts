import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHealth() {
        return {
            status: 'ok',
            service: 'apex-core',
            timestamp: new Date().toISOString(),
            version: '0.0.1',
        };
    }
}
