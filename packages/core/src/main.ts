import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for storefront access
    app.enableCors({
        origin: true,
        credentials: true,
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Apex Core is running on port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
}

bootstrap();
