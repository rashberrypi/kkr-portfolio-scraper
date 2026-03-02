import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PersonPortco } from './schemas/person-portco.schema';

@Injectable()
export class PersonPortcoService {
    constructor(
        @InjectModel(PersonPortco.name) private personPortcoModel: Model<PersonPortco>,
    ) {}

    /** All portco relationships for a given person */
    async getByPerson(personSlug: string) {
        return this.personPortcoModel.find({ personSlug }).lean();
    }

    /** All people linked to a given portfolio (by externalId) */
    async getByPortfolio(portfolioExternalId: string) {
        return this.personPortcoModel.find({ portfolioExternalId }).lean();
    }

    async getAll() {
        return this.personPortcoModel.find().lean();
    }

    async getCount() {
        return { totalRecords: await this.personPortcoModel.countDocuments() };
    }
}