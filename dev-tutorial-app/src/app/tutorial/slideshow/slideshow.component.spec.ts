import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { MarkdownModule, MarkdownService } from 'ngx-markdown'

import { SlideshowComponent } from './slideshow.component'

describe('SlideshowComponent', () => {
  let component: SlideshowComponent
  let fixture: ComponentFixture<SlideshowComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule, MarkdownModule.forRoot({ loader: HttpClient })],
      providers: [MarkdownService],
      declarations: [SlideshowComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(SlideshowComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
