import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from './schemas/person.schema';
import { PersonController } from './person.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Person.name, schema: PersonSchema }])
    ],
    providers: [],
    controllers: [PersonController],
    exports: [MongooseModule],
})
export class PersonModule { }