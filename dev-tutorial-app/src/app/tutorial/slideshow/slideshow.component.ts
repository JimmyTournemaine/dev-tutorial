import { trigger, transition, style, animate, state } from '@angular/animations';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { reduce } from 'rxjs/operators';
import { TutorialsWebServices } from 'src/app/webservices/tutorials.webservices.service';

@Component({
  selector: 'app-slideshow',
  animations: [
    trigger(
      "fadeAnimation",
      [
        transition(':enter', [
          style({ backgroundColor: '#EEA3A2' }),
          animate('2s', style({ backgroundColor: 'transparent' })),
        ]),
        transition(':leave', [
          animate(500, style({ opacity: 0 }))
        ])
      ]
    ),
    trigger(
      "upAnimation",
      [
        transition(':enter', [
          style({ position: 'relative', top: 0, transform: 'translateY(+1000px)' }),
          animate('2s', style({ transform: 'none' })),
        ]),
        transition(':leave', [
          animate(500, style({ opacity: 0 }))
        ])
      ]
    ),
    trigger(
      "downAnimation",
      [
        transition(':enter', [
          style({ position: 'relative', top: 0, transform: 'translateY(-2000px)' }),
          animate('2s', style({ transform: 'none' })),
        ]),
        transition(':leave', [
          animate(500, style({ opacity: 0 }))
        ])
      ]
    )
  ],
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css']
})
export class SlideshowComponent implements AfterViewInit {

  private _tutoId: string;
  private currentSlide = 0;

  slide: Observable<string>;
  slideVisible: boolean = true;

  set tutoId(tutoId: string) {
    if (tutoId) {
      this._tutoId = tutoId;
      this.getSlide();
    }
  }

  constructor(private ws: TutorialsWebServices, private changeDetectorRef: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
  }

  /**
   * Go to the next slide
   */
  nextSlide() {
    this.changeDetectorRef.detectChanges();
    this.slideVisible = false;

    setTimeout(() => {
      this.currentSlide++;
      this.getSlide();
      this.changeDetectorRef.detectChanges();
      this.slideVisible = true;
    }, 1000); // same value of out animation
  }

  private getSlide(): void {
    this.slide = this.ws.getSlide(this._tutoId, this.currentSlide);
  }
}
