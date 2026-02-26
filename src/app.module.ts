import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller'; 
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { PersonModule } from './modules/person/person.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    PortfolioModule,
    ScraperModule,
    PersonModule
  ],
  controllers: [AppController], 
  providers: [],
})
export class AppModule {}