import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialsPanelComponent } from './tutorials-panel.component';

describe('TutorialsPanelComponent', () => {
  let component: TutorialsPanelComponent;
  let fixture: ComponentFixture<TutorialsPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TutorialsPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
