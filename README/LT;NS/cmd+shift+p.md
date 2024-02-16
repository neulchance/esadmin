how to added the '.quick-input-widget’?

QuickInputController
- td/platform/quickinput/browser/quickInputController.ts

QuickInputService, Themable, IQuickInputService
- td/platform/quickinput/browser/quickInputService.ts
- td/workbench/services/quickinput/browser/quickInputService.ts

QuickAccessController
- td/platform/quickinput/browser/quickAccess.ts

- td/workbench/browser/actions/quickAccessActions.ts

td/workbench/contrib/quickaccess/browser/quickAccess.contribution.ts




td/workbench/workbench.common.main.ts
import 'td/workbench/browser/actions/quickAccessActions';
import 'td/workbench/services/quickinput/browser/quickInputService';
import 'td/workbench/contrib/quickaccess/browser/quickAccess.contribution';


    quickAccess.contribution.ts
────────────────┴──────────────────────
registerAction2(ShowAllCommandsAction);
                ──────────┬──────────
    workbench/contrib/quickaccess/browser/commandsQuickAccess.ts:261
                                          ──────────┬────────
              get(IQuickInputService) ──────────────┘
               ────────┬─────────
              QuickAccessController
               ────────┬─────────
                     show('>')
                 doShowOrPick('>')
               ────────┬─────────
     this.quickInputService.createQuickPick()
        this.controller.createQuickPick();
                this.getUI(true)
