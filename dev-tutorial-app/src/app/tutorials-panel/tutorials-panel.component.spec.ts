import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatGridListModule } from '@angular/material/grid-list'
import { RouterTestingModule } from '@angular/router/testing'
import { Observable } from 'rxjs'
import { Tutorial } from '../tutorial/tutorial'
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service'

import { TutorialsPanelComponent } from './tutorials-panel.component'

describe('TutorialsPanelComponent', () => {
  let component: TutorialsPanelComponent
  let fixture: ComponentFixture<TutorialsPanelComponent>

  const mockTutorial: Tutorial = {
    name: 'Mock tuto',
    description: 'Mock Tutorial description',
    resume: 'A mock tutorial',
    slug: 'mock-tutorial',
    dockerfile: '',
    icon: ''
  }
  let mockWs: jasmine.SpyObj<TutorialsWebServices>

  beforeEach(async(() => {
    mockWs = jasmine.createSpyObj('TutorialsWebServices', ['findAll'])
    mockWs.findAll.and.returnValue(new Observable(observer => {
      observer.next([mockTutorial])
      observer.complete()
    }))

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, MatGridListModule, MatCardModule, ReactiveFormsModule],
      providers: [{ provide: TutorialsWebServices, useValue: mockWs }],
      declarations: [TutorialsPanelComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialsPanelComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create the service', () => {
    expect(component).toBeTruthy()
  })
})
