import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person } from './schemas/person.schema';

@Controller('people')
export class PersonController {
    constructor(
        @InjectModel(Person.name) private readonly personModel: Model<Person>,
    ) { }

    // */people 
    @Get()
    async getAllPeople(@Query('limit') limit = 100) {
        return this.personModel
            .find()
            .limit(Number(limit))
            .sort({ fullName: 1 })
            .exec();
    }

    // */people/count 
    @Get('count')
    async getCount() {
        const count = await this.personModel.countDocuments();
        return { totalRecords: count };
    }

    // */people/search?name=John
    @Get('search')
    async searchPeople(@Query('name') name: string) {
        return this.personModel
            .find({ fullName: new RegExp(name, 'i') })
            .exec();
    }
}