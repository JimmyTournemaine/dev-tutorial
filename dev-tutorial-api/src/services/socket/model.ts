import { TutorialDescriptorDocument } from "../../models/tutorial";
import { TutorialService } from "../tutorial/tutorial";
import { ISocketService } from "./socket";
import { ValidatorDescriptorsParser, Validators } from "./validators/validator";

/**
 * The tutorial model
 */
export class Tutorial {
  private slides: Slide[];
  private currentSlide: number = 0;

  /**
   * @param {string} tutoId The tutorial identifier
   * @param {string} container The container
   * @param {Docker} docker The docker service.
   */
  constructor(public tutoId: string, service: ISocketService) {
    TutorialService.getInstance().getTutorial(this.tutoId).then((tuto: TutorialDescriptorDocument) => {
      this.slides = [];
      for (const slide of tuto.slides) {
        this.slides.push(new Slide(ValidatorDescriptorsParser.create(service, slide.validators)));
      }
    });
  }

  /**
   * Get the current slide
   * @return {Slide} The current slide
   */
  public current(): Slide {
    return this.slides[this.currentSlide];
  }

  /**
   * Switch to the next slide.
   */
  public next(): void {
    this.currentSlide++;
  }
}

/**
 * A slide of the tutorial
 */
export class Slide {

  /**
   * @param {Validators} validators The slide validators
   */
  constructor(private validators: Validators) {

  }

  // /**
  //  * Run pre-validation checks.
  //  * @param {string} cmd The command to run
  //  * @return {boolean} valid state
  //  */
  // preValidate(cmd: string): boolean {
  //   this.preValidated = this.validators.preValidate(cmd);

  //   return this.preValidated;
  // }

  // /**
  //  * Run pre-validation checks.
  //  * @param {string} data The command results data
  //  * @return {boolean} valid state
  //  */
  // postValidate(data: string): boolean {
  //   this.postValidated = this.validators.postValidate(data);

  //   return this.postValidated;
  // }
}

