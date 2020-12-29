import * as mongoose from 'mongoose';

/**
 * Slide model type
 */
interface ISlideDescriptor {
  src: string;
  validators: Object[];
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
}

const slideSchema = new mongoose.Schema({
  src: {
    type: String,
    required: true,
  },
  validators: {
    type: Object,
    required: true,
  },
});

const tutorialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  resume: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  slides: {
    type: [slideSchema],
  },
});
tutorialSchema.statics.build = (attr: ITutorialDescriptor) => {
  return new TutorialDescriptor(attr);
};

const TutorialDescriptor = mongoose.model<any, TutorialDescriptorModelInterface>('TutorialDescriptor', tutorialSchema);

export {TutorialDescriptor, TutorialDescriptorDocument};
