import { Module, Global, Provider } from '@nestjs/common';
import { InputValidatorService } from './input-validator.service';
import { SanitizerService } from './sanitizer.service';

/**
* 🏰 Digital Fortress: ValidationModule (S3)
* - وحدة مستقلة للتحقق من المدخلات
* - لا يعتمد مباشرة على SecurityContext
* - يدعم التهيئه قبل بدء التطبيق
*/
@Global()
@Module({
    providers: [
        InputValidatorService,
        SanitizerService,
        {
            provide: 'SECURITY_LOGGER',
            useValue: {
                logEvent: (event: string, details: any) => {
                    console.log(`[SECURITY_LOG] ${event}`, JSON.stringify(details, null, 2));
                }
            }
        }
    ],
    exports: [
        InputValidatorService,
        SanitizerService,
    ],
})
export class ValidationModule { }
