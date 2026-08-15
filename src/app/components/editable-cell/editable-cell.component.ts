import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, Input, Output, EventEmitter, ViewChild, signal } from '@angular/core';

export type EditableCellType = 'text' | 'currency';

/**
 * A click-to-edit spreadsheet cell: renders as plain formatted text until clicked,
 * then swaps to a focused input — mirroring Excel/Google Sheets cell editing.
 */
@Component({
  selector: 'app-editable-cell',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editable-cell.component.html',
  styleUrls: ['./editable-cell.component.scss'],
})
export class EditableCellComponent {
  @Input() value: number | string = '';
  @Input() type: EditableCellType = 'text';
  @Input() align: 'left' | 'right' = 'left';
  @Input() bold = false;

  @Output() valueChange = new EventEmitter<number | string>();

  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement>;

  editing = signal(false);
  draft = signal('');

  /** Plain-property bridge so `[(ngModel)]` can read/write the `draft` signal. */
  get draftProxy(): string {
    return this.draft();
  }
  set draftProxy(v: string) {
    this.draft.set(v);
  }

  get displayValue(): string {
    if (this.type === 'currency') {
      const n = Number(this.value) || 0;
      const sign = n < 0 ? '-' : '';
      return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(this.value ?? '');
  }

  startEdit(): void {
    this.draft.set(String(this.value ?? ''));
    this.editing.set(true);
    queueMicrotask(() => {
      this.inputRef?.nativeElement.focus();
      this.inputRef?.nativeElement.select();
    });
  }

  commit(): void {
    if (!this.editing()) return;
    this.editing.set(false);
    if (this.type === 'currency') {
      const parsed = parseFloat(this.draft().replace(/[^0-9.-]/g, ''));
      this.valueChange.emit(isNaN(parsed) ? 0 : parsed);
    } else {
      this.valueChange.emit(this.draft().trim());
    }
  }

  cancel(): void {
    this.editing.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.inputRef?.nativeElement.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }
}
