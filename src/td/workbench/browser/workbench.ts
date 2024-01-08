import {Emitter} from 'td/base/common/event';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {ILogService} from 'td/platform/log/common/log';
import {Layout} from 'td/workbench/browser/layout';
import {WillShutdownEvent} from 'td/workbench/services/lifecycle/common/lifecycle';

export interface IWorkbenchOptions {

	/**
	 * Extra classes to be added to the workbench container.
	 */
	extraClasses?: string[];
}

export class Workbench extends Layout {

  private readonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
  readonly onWillShutdown = this._onWillShutdown.event;

	private readonly _onDidShutdown = this._register(new Emitter<void>());
	readonly onDidShutdown = this._onDidShutdown.event;
  
  constructor(
    parent: HTMLElement,
    private readonly options: IWorkbenchOptions | undefined,
		private readonly serviceCollection: ServiceCollection,
		logService: ILogService
  ) {
    console.log('%c Oh my heavens! ', 'background: #222; color: #bada55');
    console.log('parent', parent)
    super(parent);
    
  }
  startup() {
    try {
      console.log('try startup')
    } catch (error) {

    }
  }
}