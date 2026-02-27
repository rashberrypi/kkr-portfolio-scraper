import { generatePersonSlug } from "./utils/slugger.util";
import { Person } from "./schemas/person.schema";
import { Injectable  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';


@Injectable()
export class PersonResolverService {
  constructor(@InjectModel(Person.name) private personModel: Model<Person>) {}

  async resolveIdentity(name: string, firm: string): Promise<string> {
    const baseSlug = generatePersonSlug(name);
    
    // 1. Try to find an exact match by name AND current firm
    const existing = await this.personModel.findOne({ 
      fullName: name, 
      currentGp: firm 
    });

    if (existing) return existing.personSlug;

    // 2. If not found, create a composite slug to prevent collision 
    // with a different "John Smith" at Blackstone
    return `${baseSlug}-${generatePersonSlug(firm)}`;
  }
}