import * as mongoose from 'mongoose';
import * as mongooseFuzzy from 'mongoose-fuzzy-searching';

/**
 * Slide model type
 *
 * @openapi
 * components:
 *   schemas:
 *     Slide:
 *       properties:
 *         src:
 *           type: string
 *         validators:
 *           type: array
 *           items:
 *             type: object
 *       required:
 *         - src
 */
interface ISlideDescriptor {
  src: string;
  validators: Record<string, unknown>[];
}

/**
 * Tutorial model type (for document creation)
 *
 * @openapi
 * components:
 *   schemas:
 *     Tutorial:
 *       properties:
 *         name:
 *           type: string
 *         resume:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         icon:
 *           type: string
 *         dirname:
 *           type: string
 *         slides:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Slide'
 *       required:
 *         - name
 *         - resume
 *         - slug
 *         - description
 *         - slides
 *         - dirname
 */
export interface ITutorialDescriptor {
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
    required: true,
  },
  validators: {
    type: Object,
    required: true,
  },
});

const tutorialSchema = new mongoose.Schema<TutorialDescriptorModelInterface>({
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
  dirname: {
    type: String,
    required: true,
  },
});

const statics = tutorialSchema.statics as TutorialDescriptorModelInterface;
// static.build has to be defined before TutorialDescriptor declaration, otherwise build method does not exist
// eslint-disable-next-line @typescript-eslint/no-use-before-define
statics.build = (attr: ITutorialDescriptor): TutorialDescriptorDocument => new TutorialDescriptor(attr);
tutorialSchema.plugin(mongooseFuzzy, { fields: ['name', 'resume'] });

const TutorialDescriptor = mongoose.model<TutorialDescriptorDocument, TutorialDescriptorModelInterface>(
  'TutorialDescriptor',
  tutorialSchema
);

export { TutorialDescriptor, TutorialDescriptorDocument };
