import { LayoutModule } from '@angular/cdk/layout';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MarkdownModule, MarkedOptions, MarkedRenderer } from 'ngx-markdown';
import { MatDialogModule } from '@angular/material/dialog';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TutorialCompletedDialogComponent, TutorialComponent } from './tutorial/tutorial.component';
import { TutorialsPanelComponent } from './tutorials-panel/tutorials-panel.component';
import { TerminalComponent } from './tutorial/terminal/terminal.component';
import { EditorComponent } from './tutorial/editor/editor.component';
import { QuitWithoutSavingDialogComponent } from './tutorial/editor/editor.quit-dialog.component';
import { SlideshowComponent } from './tutorial/slideshow/slideshow.component';
import { EditorAddedDirective } from './tutorial/editor/editor.added.directive';

const markedOptionsFactory = () => {
  const renderer = new MarkedRenderer();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const linkRenderer: (href: string, title: string, text: string) => string = renderer.link;

  renderer.link = (href: string, title: string, text: string): string => {
    const html = linkRenderer.call(renderer, href, title, text) as string;
    return html.replace(/^<a /, '<a role="link" tabindex="0" target="_blank" rel="nofollow noopener noreferrer" ');
  };

  return {
    renderer,
    gfm: true,
    breaks: false,
    pedantic: false,
    smartLists: true,
    smartypants: false
  };
};

@NgModule({
  declarations: [
    AppComponent,
    TutorialComponent,
    HomeComponent,
    TutorialsPanelComponent,
    TerminalComponent,
    EditorComponent,
    QuitWithoutSavingDialogComponent,
    SlideshowComponent,
    TutorialCompletedDialogComponent,
    EditorAddedDirective,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    MarkdownModule.forRoot({
      loader: HttpClient,
      markedOptions: {
        provide: MarkedOptions,
        useFactory: markedOptionsFactory
      }
    }),
    AppRoutingModule,
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatGridListModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTabsModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
