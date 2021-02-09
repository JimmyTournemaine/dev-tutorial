import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { TutorialComponent } from './tutorial/tutorial.component'
import { HomeComponent } from './home/home.component'

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'tutorial/:slug', component: TutorialComponent }
]

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
