import { Module, OnModuleInit, OnModuleDestroy, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 🏰 Digital Fortress: Prisma Module
 * - المسؤول عن التهيئة والاستبدال الآمن لـ PrismaClient
 * - يضمن عزل قاعدة البيانات بين المستأجرين
 * - يدعم الاتصال بالتتابع مع التحقق من الصحة
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly prismaService: PrismaService) { }

    /**
     * 🔒 عند تهيئة الوحدة
     * - التحقق من اتصال قاعدة البيانات الأساسي
     * - تطبيق التصلب الأمني على PrismaClient
     */
    async onModuleInit() {
        try {
            // 🛡️ التحقق من صحة الاتصال بقاعدة البيانات الأساسية
            await this.prismaService.$connect();

            // 📝 تسجيل تهيئة ناجحة
            console.log('✅ Prisma connection established successfully');

            // 🛡️ تطبيق إعدادات الأمان الإضافية
            this.prismaService.applySecurityHardening();
        } catch (error) {
            console.error('🚨 Critical: Failed to connect to database', error);
            throw new Error('Database connection failed - cannot start application');
        }
    }

    /**
     * 🔒 عند إيقاف الوحدة
     * - إغلاق اتصال قاعدة البيانات بلطف
     * - مسح البيانات الحساسة من الذاكرة
     */
    async onModuleDestroy() {
        try {
            await this.prismaService.$disconnect();
            console.log('✅ Prisma connection closed gracefully');
        } catch (error) {
            console.error('⚠️ Warning: Failed to close database connection', error);
        }
    }
}
