import { Component, OnInit } from '@angular/core';
import { Tutorial } from '../tutorial/tutorial';
import { Router } from '@angular/router';
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service';
import { Observable } from 'rxjs';
import { debounceTime, startWith, switchMap, filter } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-tutorials-panel',
  templateUrl: './tutorials-panel.component.html',
  styleUrls: ['./tutorials-panel.component.css']
})
export class TutorialsPanelComponent implements OnInit {
  tutorials: Observable<Tutorial[]>;
  searchForm: FormGroup;

  constructor(private router: Router, private ws: TutorialsWebServices, private fb: FormBuilder) {
    this.searchForm = this.fb.group({ searchInput: null });
  }

  ngOnInit(): void {
    this.tutorials = this.searchForm
      .get('searchInput')
      .valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        filter((value) => value.length === 0 || value.length > 2),
        switchMap(value => this.ws.search({ search: value }))
      );
  }

  startTutorial(slug: string): void {
    // Navigate
    this.router.navigateByUrl(`tutorial/${slug}`);
  }
}
