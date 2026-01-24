import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    async sendMail(options: { to: string; subject: string; template: string; context: any }): Promise<void> {
        this.logger.log(`Sending mail to ${options.to} with subject ${options.subject}`);
        // Mock implementation for CI stabilization
    }

    async sendOrderConfirmation(email: string, orderData: any): Promise<void> {
        this.logger.log(`Sending order confirmation to ${email}`);
    }

    async sendPaymentConfirmation(email: string, paymentData: any): Promise<void> {
        this.logger.log(`Sending payment confirmation to ${email}`);
    }
}
