import { z } from 'zod';
import { ShippingAddressSchema } from './checkout.dto';

export type ShippingAddressDto = z.infer<typeof ShippingAddressSchema>;
