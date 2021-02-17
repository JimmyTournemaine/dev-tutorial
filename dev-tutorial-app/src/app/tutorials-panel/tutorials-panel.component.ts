import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { debounceTime, startWith, switchMap, filter } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service';
import { Tutorial } from '../tutorial/tutorial';

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
        filter((value: string) => value.length === 0 || value.length > 2),
        switchMap((value: string) => this.ws.search({ search: value }))
      );
  }

  startTutorial(slug: string): void {
    // Navigate
    void this.router.navigateByUrl(`tutorial/${slug}`);
  }
}
