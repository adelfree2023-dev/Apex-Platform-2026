import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 🛡️ S3: Secure Login DTO
 */
export class LoginDto {
    @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صالحة' })
    @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
    email: string;

    @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
    @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
    password: string;
}
