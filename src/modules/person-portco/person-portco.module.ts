import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonPortcoController } from './person-portco.controller';
import { PersonPortcoService } from './person-portco.service';
import { PersonPortco, PersonPortcoSchema } from './schemas/person-portco.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PersonPortco.name, schema: PersonPortcoSchema },
        ]),
    ],
    controllers: [PersonPortcoController],
    providers: [PersonPortcoService],
    exports: [PersonPortcoService],
})
export class PersonPortcoModule {}