import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from './schemas/person.schema';
import { PersonController } from './person.controller';
import { PersonService } from './person-service';
import { PersonPortco, PersonPortcoSchema } from '../person-portco/schemas/person-portco.schema';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Person.name, schema: PersonSchema },
            { name: PersonPortco.name, schema: PersonPortcoSchema },
        ])
    ],
    providers: [PersonService],
    controllers: [PersonController],
    exports: [MongooseModule, PersonService],
})
export class PersonModule { }