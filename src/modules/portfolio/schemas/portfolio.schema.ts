import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PortfolioSyncStatus = 'synced' | 'stub';

@Schema({ timestamps: true })
export class Portfolio extends Document {
  @Prop({ required: true }) sourceGp: string;
  @Prop({ required: true, unique: true }) externalId: string;
  @Prop({ required: true }) name: string;
  @Prop() website: string;
  @Prop({ type: Object }) basics: { hq: string; industry: string; region: string; description: string };
  @Prop({ type: Object }) investment: { entryYear: number; assetClass: string[] };

  @Prop({
    default: 'synced',
    enum: ['synced', 'stub'],
  })
  syncStatus: PortfolioSyncStatus;
  // 'synced' = came from the real KKR portfolio scrape
  // 'stub'   = created by enrichment pipeline because Gemini found a portco name
  //            that didn't match any scraped portfolio (e.g. an exited company)
}
export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);