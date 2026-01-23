import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * 🛡️ S3: Secure Register DTO
 */
export class RegisterDto {
    @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صالحة' })
    @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
    email: string;

    @MinLength(12, { message: 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل' })
    @MaxLength(128)
    @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
    password: string;

    @MinLength(2, { message: 'الاسم قصير جداً' })
    @IsNotEmpty({ message: 'الاسم مطلوب' })
    name: string;
}
