import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PersonPortco extends Document {
    @Prop({ required: true, type: Types.ObjectId, ref: 'Person' })
    personId: Types.ObjectId;

    @Prop({ required: true })
    personSlug: string;

    @Prop({ required: true, type: Types.ObjectId, ref: 'Portfolio' })
    portfolioId: Types.ObjectId;

    @Prop({ required: true })
    portfolioExternalId: string;

    @Prop({ required: true })
    portfolioName: string;

    @Prop() role?: string;
    @Prop() startDate?: string;
    @Prop() endDate?: string;

    @Prop({ default: 'gemini' })
    extractedBy: 'gemini' | 'manual';

    @Prop({ default: 1.0 })
    matchConfidence: number;
}

export const PersonPortcoSchema = SchemaFactory.createForClass(PersonPortco);

PersonPortcoSchema.index({ personSlug: 1, portfolioExternalId: 1 }, { unique: true });
PersonPortcoSchema.index({ personSlug: 1 });
PersonPortcoSchema.index({ portfolioId: 1 });