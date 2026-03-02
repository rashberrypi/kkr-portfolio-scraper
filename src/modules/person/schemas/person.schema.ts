import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class PersonSources {
    @Prop() kkrUrl?: string;
    @Prop() secUrl?: string;
    @Prop() linkedinUrl?: string;
    @Prop() bloombergUrl?: string;
}

@Schema({ _id: false })
class PersonFingerprints {
    @Prop() secCik?: string;        // SEC Central Index Key
    @Prop() linkedInId?: string;    // Permanent LinkedIn Numerical ID
}

export type PersonSyncStatus =
    | 'pending'
    | 'bio_fetching'
    | 'bio_fetched'
    | 'bio_failed'
    | 'enriching'
    | 'synced'
    | 'enrich_failed';

@Schema({ timestamps: true })
export class Person extends Document {
    @Prop({ required: true, unique: true })
    personSlug: string; // e.g., "aadhaar-mehra-kkr"

    @Prop({ required: true })
    fullName: string;
    @Prop({ type: PersonFingerprints })
    fingerprints: PersonFingerprints;

    @Prop() currentTitle: string;
    @Prop() primaryTeam: string;
    @Prop() officeLocation: string;

    @Prop({ type: PersonSources })
    sources: PersonSources;

    // Track which firm they are currently associated with
    @Prop({ required: true })
    currentGp: string;

    @Prop({ default: '' })
    rawBiography: string;

    @Prop({
        default: 'pending',
        enum: ['pending', 'bio_fetching', 'bio_fetched', 'bio_failed', 'enriching', 'synced', 'enrich_failed'],
    })
    syncStatus: PersonSyncStatus;

    @Prop({ default: '' })
    syncError?: string;

    @Prop()
    lastEnrichedAt?: Date;
}


export const PersonSchema = SchemaFactory.createForClass(Person);

// Indexes for pipeline queries
PersonSchema.index({ syncStatus: 1 });
PersonSchema.index({ currentGp: 1, syncStatus: 1 });
