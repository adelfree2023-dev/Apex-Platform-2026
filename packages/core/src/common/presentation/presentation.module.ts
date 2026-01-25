import { Module, Global } from '@nestjs/common';
import { CSPConfig } from './security-headers/csp.config';
import { HelmetConfig } from './security-headers/helmet.config';

@Global()
@Module({
    providers: [
        CSPConfig,
        HelmetConfig,
    ],
    exports: [
        CSPConfig,
        HelmetConfig,
    ],
})
export class PresentationModule { }
