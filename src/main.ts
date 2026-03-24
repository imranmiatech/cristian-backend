import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { SeederService } from './core/seed/seed.service';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path'; 

async function bootstrap() {
  // Specify NestExpressApplication to access useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const seeder = app.get(SeederService);
  await seeder.seedAdmin();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 9099;

  const originString = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = originString.split(',').map(o => o.trim()).filter(Boolean);

  app.use(cookieParser());
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  await app.listen(port, '0.0.0.0');
  console.log(`Server running on http://localhost:${port}/docs`);
  console.log(`Allowed Origins:`, allowedOrigins);
}
bootstrap();