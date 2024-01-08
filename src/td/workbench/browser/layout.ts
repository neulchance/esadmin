import {Disposable} from 'td/base/common/lifecycle';
import {IWorkbenchLayoutService} from '../services/layout/browser/layoutService';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {Part} from 'td/workbench/browser/part';

export abstract class Layout extends Disposable /* implements IWorkbenchLayoutService */ {

  declare readonly _serviceBrand: undefined;

  //#region Properties

  readonly mainContainer = document.createElement('div');

  //#endregion

  private readonly parts = new Map<string, Part>();

  constructor(
    protected readonly parent: HTMLElement
  ) {
    super();
  }

  protected initLayout(accessor: ServicesAccessor): void {
    console.log('called from it')
  }

  protected createWorkbenchLayout(): void {
  }

  layout(): void {
	}
}
