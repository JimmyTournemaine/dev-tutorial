import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'

import { TutorialsWebServices } from './tutorials.webservices.service'

describe('Tutorials.WebservicesService', () => {
  let service: TutorialsWebServices
  let httpTestingController: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] })
    service = TestBed.inject(TutorialsWebServices)
    httpTestingController = TestBed.inject(HttpTestingController)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  afterEach(() => {
    httpTestingController.verify()
  })
})
