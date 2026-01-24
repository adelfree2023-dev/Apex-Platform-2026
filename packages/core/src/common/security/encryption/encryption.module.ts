import { Module, Global } from '@nestjs/common';
import { EncryptedFieldService } from './encrypted-field.service';
import { KeyManagementService } from './key-management.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EncryptedFieldService, KeyManagementService],
    exports: [EncryptedFieldService, KeyManagementService],
})
export class EncryptionModule { }
