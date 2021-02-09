import * as mongoose from 'mongoose'
import * as mongooseFuzzy from 'mongoose-fuzzy-searching'

/**
 * Slide model type
 */
interface ISlideDescriptor {
  src: string;
  validators: Record<string, unknown>[];
}

/**
 * Tutorial model type (for document creation)
 */
interface ITutorialDescriptor {
  name: string;
  resume: string;
  slug: string;
  description: string;
  icon?: string;
  slides: ISlideDescriptor[];
  dirname: string;
}

/**
 * TutorialDescriptor Document type (returned by MongoDB)
 */
interface TutorialDescriptorDocument extends ITutorialDescriptor, mongoose.Document {

}

/**
 * TutorialDescriptor Model interface
 */
interface TutorialDescriptorModelInterface extends mongoose.Model<TutorialDescriptorDocument> {
  build(attr: ITutorialDescriptor): TutorialDescriptorDocument;

  // Provided by mongoose-fuzzy-searching
  fuzzySearch(search: string, callback?: (err: Error, tutos: TutorialDescriptorDocument[]) => void): TutorialDescriptorDocument[];
}

const slideSchema = new mongoose.Schema({
  src: {
    type: String,
    required: true
  },
  validators: {
    type: Object,
    required: true
  }
})

const tutorialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  resume: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  slides: {
    type: [slideSchema]
  },
  dirname: {
    type: String,
    required: true
  }
})
tutorialSchema.statics.build = (attr: ITutorialDescriptor): any => {
  return new TutorialDescriptor(attr)
}
tutorialSchema.plugin(mongooseFuzzy, { fields: ['name', 'resume'] })

const TutorialDescriptor = mongoose.model<any, TutorialDescriptorModelInterface>('TutorialDescriptor', tutorialSchema)

export { TutorialDescriptor, TutorialDescriptorDocument }
