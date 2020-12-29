import { TestBed } from '@angular/core/testing';

import { TutorialsWebServices } from './tutorials.webservices.service';

describe('Tutorials.WebservicesService', () => {
  let service: TutorialsWebServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutorialsWebServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
