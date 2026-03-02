import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Person } from './schemas/person.schema';
import { PersonPortco } from '../person-portco/schemas/person-portco.schema';

@Injectable()
export class PersonService {
  constructor(
    @InjectModel(Person.name)
    private personModel: Model<Person>,

    @InjectModel(PersonPortco.name)
    private personPortcoModel: Model<PersonPortco>,
  ) {}

  async getPersonWithRelationships(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid person id');
    }

    const person = await this.personModel.findById(id).lean();

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const relationships = await this.personPortcoModel
      .find({ personId: person._id })
      .lean();

    return {
      person,
      portfolioRelationships: relationships,
    };
  }
}