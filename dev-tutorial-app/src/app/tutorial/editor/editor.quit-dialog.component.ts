import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export enum QuitWithoutSavingDialogCloseState {
  SAVE,
  DONTSAVE,
  CANCEL
}

@Component({
  template: `
    <h2 mat-dialog-title>Do you want to save the changes you made to {{ label }}?</h2>
    <mat-dialog-content class="mat-typography">
      Your changes will be lost if you don't save them.
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button cdkFocusInitial (click)="save()">Save</button>
      <button mat-button (click)="dontsave()">Don't save</button>
      <button mat-button (click)="cancel()">Cancel</button>
    </mat-dialog-actions>`,
})
export class QuitWithoutSavingDialogComponent {
  label: string;

  constructor(private dialogRef: MatDialogRef<QuitWithoutSavingDialogComponent>, @Inject(MAT_DIALOG_DATA) data: { label: string }) {
    this.label = data.label;
  }

  save(): void {
    this.dialogRef.close(QuitWithoutSavingDialogCloseState.SAVE);
  }

  dontsave(): void {
    this.dialogRef.close(QuitWithoutSavingDialogCloseState.DONTSAVE);
  }

  cancel(): void {
    this.dialogRef.close(QuitWithoutSavingDialogCloseState.CANCEL);
  }
}
