import { ApiProperty } from '@nestjs/swagger';

export class OrderResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    orderNumber: string;

    @ApiProperty()
    totalAmount: number;

    @ApiProperty()
    currency: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    estimatedDelivery?: string;

    @ApiProperty()
    createdAt?: string;

    @ApiProperty()
    items: any[];

    @ApiProperty()
    shippingAddress?: any;

    @ApiProperty()
    customerInfo?: any;
}
