import { z } from 'zod';

export const DateRangeSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ البداية غير صالح').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الانتهاء غير صالح').optional(),
});

export class DateRangeDto {
    static schema = DateRangeSchema;

    startDate?: string;
    endDate?: string;
}
