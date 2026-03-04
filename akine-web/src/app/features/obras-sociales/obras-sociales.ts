import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ObrasSocialesListPage } from './pages/obras-sociales-list/obras-sociales-list';

@Component({
  selector: 'app-obras-sociales',
  standalone: true,
  imports: [ObrasSocialesListPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-obras-sociales-list-page />`,
})
export class ObrasSociales {}

