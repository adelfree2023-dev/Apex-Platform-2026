import { z } from 'zod';

export class ProcessWebhookDto {
    type: string;
    data: {
        object: {
            id: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
    [key: string]: any;
}
