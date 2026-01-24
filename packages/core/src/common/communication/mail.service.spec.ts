import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { Logger } from '@nestjs/common';

describe('MailService', () => {
    let service: MailService;
    let loggerSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MailService],
        }).compile();

        service = module.get<MailService>(MailService);
        loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        loggerSpy.mockRestore();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log generic mail sending', async () => {
        await service.sendMail({
            to: 'test@example.com',
            subject: 'Test',
            template: 'tpl',
            context: {},
        });
        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Sending mail to test@example.com'));
    });

    it('should log order confirmation', async () => {
        await service.sendOrderConfirmation('order@example.com', {});
        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Sending order confirmation to order@example.com'));
    });

    it('should log payment confirmation', async () => {
        await service.sendPaymentConfirmation('pay@example.com', {});
        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Sending payment confirmation to pay@example.com'));
    });
});
