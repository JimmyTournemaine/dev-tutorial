import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

import { EditorComponent } from './editor.component';
import { QuitWithoutSavingDialogComponent } from './editor.quit-dialog.component';
import { EditorService } from './editor.service';

describe('Components: Editor', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<QuitWithoutSavingDialogComponent>>;
  let editorService: EditorService;

  beforeEach(async () => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<QuitWithoutSavingDialogComponent>>('MatDialogRef', ['close']);
    editorService = new EditorService();

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, MatTabsModule],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EditorService, useValue: editorService },
      ],
      declarations: [EditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.selectedEditor).toEqual(0);
    expect(component.editorTabs.length).toEqual(0);
  });
});
