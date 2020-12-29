import { Component, OnInit, Input } from '@angular/core';
import { Tutorial } from '../tutorial/tutorial';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tutorials-panel',
  templateUrl: './tutorials-panel.component.html',
  styleUrls: ['./tutorials-panel.component.css']
})
export class TutorialsPanelComponent implements OnInit {

  @Input()
  cols: number;

  @Input('max-cards')
  maxCards: number;

  tutorials: Observable<Tutorial[]>;

  allTutorialNames: string[];

  constructor(private router: Router, private ws: TutorialsWebServices) { }

  ngOnInit(): void {
    this.tutorials = this.ws.findAll();
  }

  startTutorial(slug: string): void {
    // Navigate
    this.router.navigateByUrl(`tutorial/${slug}`);
  }

}
