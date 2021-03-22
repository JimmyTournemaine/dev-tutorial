import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuitWithoutSavingDialogComponent } from './editor.quit-dialog.component';

describe('Dialog: Quit the editor', () => {
  let component: QuitWithoutSavingDialogComponent;
  let fixture: ComponentFixture<QuitWithoutSavingDialogComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<QuitWithoutSavingDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<QuitWithoutSavingDialogComponent>>('MatDialogRef', ['close']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef);

    await TestBed.configureTestingModule({
      declarations: [QuitWithoutSavingDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { label: 'test' } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuitWithoutSavingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.label).toEqual('test');
  });
});
