import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Portfolio extends Document {
  @Prop({ required: true }) sourceGp: string;
  @Prop({ required: true, unique: true }) externalId: string;
  @Prop({ required: true }) name: string;
  @Prop() website: string;
  @Prop({ type: Object }) basics: { hq: string; industry: string; region: string; description: string };
  @Prop({ type: Object }) investment: { entryYear: number; assetClass: string[] };
}
export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);