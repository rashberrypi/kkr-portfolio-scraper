import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { Portfolio, PortfolioSchema } from './schemas/portfolio.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Portfolio.name, schema: PortfolioSchema }])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [MongooseModule] // Exporting so Scraper can use the Model
})
export class PortfolioModule {}