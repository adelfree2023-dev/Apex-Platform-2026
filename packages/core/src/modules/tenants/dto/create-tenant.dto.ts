import { IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, IsIn } from 'class-validator';

/**
 * 🛡️ ASMP S3: Secure Tenant Creation DTO
 * - Prevents anonymous data injection into tenant provisioning
 */
export class CreateTenantDto {
    @IsNotEmpty({ message: 'اسم المتجر مطلوب' })
    @MinLength(2, { message: 'اسم المتجر قصير جداً' })
    @MaxLength(100)
    storeName: string;

    @IsNotEmpty({ message: 'النطاق الفرعي مطلوب' })
    @Matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
        message: 'صيغة النطاق الفرعي غير صالحة (يجب أن يبدأ بحرف ويحتوي على أحرف وأرقام وشرطات فقط)'
    })
    @MinLength(3)
    @MaxLength(50)
    subdomain: string;

    @IsNotEmpty({ message: 'نوع العمل مطلوب' })
    @IsIn(['retail', 'services', 'b2b', 'marketplace'], { message: 'نوع عمل غير صالح' })
    businessType: string;

    @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صالحة' })
    @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
    email: string;

    @MinLength(12, { message: 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل' })
    @MaxLength(128)
    @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
    password: string;
}
