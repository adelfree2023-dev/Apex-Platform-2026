import { z } from 'zod';
import { CustomerInfoSchema } from './checkout.dto';

export type CustomerInfoDto = z.infer<typeof CustomerInfoSchema>;
