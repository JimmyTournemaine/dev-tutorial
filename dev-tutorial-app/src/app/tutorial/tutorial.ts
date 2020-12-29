/**
 * A complete tutorial
 */
export class Tutorial {
  /* The tutorial's name */
  name: string;

  /* A short description of the tutorial */
  resume: string;

  /* A slug for this tutorial */
  slug: string;

  /* An icon for the tutorial */
  icon: string;

  /* A complete description of the tutorial purpose */
  description: string;

  /* A Dockerfile to install tutorial requirements */
  dockerfile: string = 'alpine:latest';
}

export class TutorialSection {

}
