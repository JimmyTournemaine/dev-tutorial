import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { first } from 'rxjs/operators';
import { Tutorial } from '../tutorial/tutorial';
import { TutorialsWebServices } from '../ws/tutorial.ws.service';

import { TutorialsPanelComponent } from './tutorials-panel.component';

describe('Components: Tutorials Panel', () => {
  const mockTutorials: Tutorial[] = [{
    name: 'Mock tuto',
    description: 'Mock Tutorial description',
    resume: 'A mock tutorial',
    slug: 'mock-tutorial',
    dockerfile: '',
    icon: ''
  }, {
    name: 'Second test tutorial',
    description: 'This is a description a my tutorial',
    resume: 'The 2nd',
    slug: 'mock-tutorial-2',
    dockerfile: '',
    icon: ''
  }, {
    name: 'Mock tuto 3',
    description: 'The third of this fake list',
    resume: 'Hello world!',
    slug: 'mock-tutorial-3',
    dockerfile: '',
    icon: ''
  }];

  let ws: jasmine.SpyObj<TutorialsWebServices>;
  let component: TutorialsPanelComponent;
  let fixture: ComponentFixture<TutorialsPanelComponent>;

  beforeEach(async () => {
    ws = jasmine.createSpyObj<TutorialsWebServices>('TutorialsWebServices', ['search']);
    ws.search.and.callFake((s) => of(mockTutorials.filter((tuto: Tutorial) => tuto.name.indexOf(s.search) >= 0)));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, MatGridListModule, MatCardModule, ReactiveFormsModule],
      providers: [{ provide: TutorialsWebServices, useValue: ws }],
      declarations: [TutorialsPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TutorialsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load tutorials on init', (done) => {
    component.tutorials.subscribe((tutos) => {
      expect(tutos.length).toEqual(3);
      done();
    });
  });

  it('should search tutorials', (done) => {
    // ngOnInit
    component.tutorials.pipe(first()).subscribe(() => {
      // Search
      component.tutorials.subscribe((searchedTutos) => {
        expect(searchedTutos.length).toEqual(1);
        done();
      });
      const form = component.searchForm;
      form.controls.searchInput.setValue('Second');
      expect(form.valid).toBeTrue();
    });
  });

  it('should navigate to the selected tutorial', () => {
    const navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl');

    component.startTutorial('mock-tutorial');

    expect(navigateByUrl).toHaveBeenCalled();
  });
});
