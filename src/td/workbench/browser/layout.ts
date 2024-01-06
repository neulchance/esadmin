import {Disposable} from 'td/base/common/lifecycle';
import {IWorkbenchLayoutService} from '../services/layout/browser/layoutService';

export abstract class Layout extends Disposable /* implements IWorkbenchLayoutService */ {
  constructor(
    protected readonly parent: HTMLElement
  ) {
    super();
  }
}
