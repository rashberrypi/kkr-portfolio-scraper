import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from './schemas/portfolio.schema';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
  ) {}

  /**
   * Returns all portfolio companies.
   * Analysts can use this to export the full dataset to Excel/CSV.
   */
  async findAll(): Promise<Portfolio[]> {
    this.logger.log('Fetching all portfolio companies');
    return this.portfolioModel
      .find()
      .sort({ name: 1 }) // Alphabetical order
      .exec();
  }

  /**
   * Find a single company by its unique name or ID.
   */
  async findOne(externalId: string): Promise<Portfolio | null> {
    return this.portfolioModel.findOne({ externalId }).exec();
  }

  /**
   * Simple filter by industry. 
   * Useful for analysts wanting to see just "Healthcare" or "Technology".
   */
  async findByIndustry(industry: string): Promise<Portfolio[] | null> {
    return this.portfolioModel.find({ 'basics.industry': industry }).exec();
  }
}