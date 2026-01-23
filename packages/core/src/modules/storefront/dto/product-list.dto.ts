import { ApiProperty } from '@nestjs/swagger';

export class ProductListDto {
    @ApiProperty()
    data: any[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
