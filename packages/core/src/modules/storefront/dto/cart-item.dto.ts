import { z } from 'zod';
import { CartItemSchema } from './checkout.dto';

export type CartItemDto = z.infer<typeof CartItemSchema>;
