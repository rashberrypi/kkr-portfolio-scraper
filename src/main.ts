import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
   app.enableCors({
    origin: "http://localhost:3000",
  });
  
  const config = new DocumentBuilder()
    .setTitle('Jerry for berry')
    .setDescription('Scraper and Portfolio Management API')
    .setVersion('3.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(8080, '0.0.0.0');
  console.log(`Application is running on: http://localhost:8080/api`);
}
bootstrap();