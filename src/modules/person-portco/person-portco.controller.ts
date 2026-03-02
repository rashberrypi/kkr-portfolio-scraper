import { Controller, Get, Param, Query } from '@nestjs/common';
import { PersonPortcoService } from './person-portco.service';

@Controller('person-portco')
export class PersonPortcoController {
    constructor(private readonly personPortcoService: PersonPortcoService) {}

    @Get()
    getAll(@Query('limit') limit = 100) {
        return this.personPortcoService.getAll(Number(limit));
    }

    @Get('count')
    getCount() {
        return this.personPortcoService.getCount();
    }

    @Get('by-person/:personSlug')
    getByPerson(@Param('personSlug') personSlug: string) {
        return this.personPortcoService.getByPerson(personSlug);
    }

    @Get('by-portfolio/:externalId')
    getByPortfolio(@Param('externalId') externalId: string) {
        return this.personPortcoService.getByPortfolio(externalId);
    }
}