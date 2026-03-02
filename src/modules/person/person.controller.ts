import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person } from './schemas/person.schema';
import { PersonService } from './person-service';

@Controller('people')
export class PersonController {
    constructor(
        @InjectModel(Person.name) private readonly personModel: Model<Person>,
        private readonly personService: PersonService
    ) { }

    // */people 
    @Get()
    async getAllPeople() {
        return this.personModel
            .find()
            .sort({ fullName: 1 })
            .lean()
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
            .lean()
            .exec();
    }


    @Get(':id')
    async getPersonById(@Param('id') id: string) {
        return this.personService.getPersonWithRelationships(id);
    }
}