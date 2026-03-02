import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Person } from '../person/schemas/person.schema';
import { Portfolio } from '../portfolio/schemas/portfolio.schema';
import { PersonPortco } from '../person-portco/schemas/person-portco.schema';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectModel(Person.name) private personModel: Model<Person>,
        @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
        @InjectModel(PersonPortco.name) private personPortcoModel: Model<PersonPortco>,
    ) { }

    async getOverview() {
        const [
            totalPeople,
            totalPortfolios,
            totalRelationships,
            stubPortfolios,
            peopleBySyncStatus,
        ] = await Promise.all([
            this.personModel.countDocuments(),
            this.portfolioModel.countDocuments(),
            this.personPortcoModel.countDocuments(),
            this.portfolioModel.countDocuments({ syncStatus: 'stub' }),
            this.personModel.aggregate([
                {
                    $group: {
                        _id: '$syncStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        return {
            totalPeople,
            totalPortfolios,
            totalRelationships,
            stubPortfolios,
            peopleBySyncStatus,
        };
    }

    async getPortfolioDistribution() {
        const [
            byIndustry,
            byRegion,
            byAssetClass,
            byEntryYear,
            bySyncStatus,
        ] = await Promise.all([
            this.portfolioModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$basics.industry', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            this.portfolioModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$basics.region', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            this.portfolioModel.aggregate([
                { $unwind: { path: '$investment.assetClass', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { $ifNull: ['$investment.assetClass', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            this.portfolioModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$investment.entryYear', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            this.portfolioModel.aggregate([
                {
                    $group: {
                        _id: '$syncStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        return {
            byIndustry,
            byRegion,
            byAssetClass,
            byEntryYear,
            bySyncStatus,
        };
    }

    async getPeopleDistribution() {
        const [
            byTeam,
            byOffice,
            bySyncStatus,
            byCurrentGp,
            missingLinkedIn,
            missingSecCik,
            missingBiography,
        ] = await Promise.all([
            this.personModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$primaryTeam', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            this.personModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$officeLocation', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            this.personModel.aggregate([
                {
                    $group: {
                        _id: '$syncStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),

            this.personModel.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$currentGp', 'Unknown'] },
                        count: { $sum: 1 },
                    },
                },
            ]),

            this.personModel.countDocuments({
                $or: [
                    { 'fingerprints.linkedInId': { $exists: false } },
                    { 'fingerprints.linkedInId': null },
                ],
            }),

            this.personModel.countDocuments({
                $or: [
                    { 'fingerprints.secCik': { $exists: false } },
                    { 'fingerprints.secCik': null },
                ],
            }),

            this.personModel.countDocuments({
                $or: [
                    { rawBiography: { $exists: false } },
                    { rawBiography: '' },
                ],
            }),
        ]);

        return {
            byTeam,
            byOffice,
            bySyncStatus,
            byCurrentGp,
            dataCompleteness: {
                missingLinkedIn,
                missingSecCik,
                missingBiography,
            },
        };
    }
}
