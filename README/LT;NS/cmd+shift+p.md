```ts
KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP
```

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


```ts
    quickAccess.contribution.ts
────────────────┴──────────────────────
registerAction2(ShowAllCommandsAction);
                ──────────┬──────────
    workbench/contrib/quickaccess/browser/commandsQuickAccess.ts:261
                                          ────────┬──────────
        ┌ run() ──────────────────────────────────┴────────────────────────────────────────┐
        │                                                                          '>'─┐   │
        │     get(IQuickInputService).quickAccess.show(CommandsQuickAccessProvider.PREFIX) │
        │       QuickAccessController ───┘        ─┬──                                     │
        │             ┌────────────────────────────┘                                       │
        └─────────────┼────────────────────────────────────────────────────────────────────┘             
                 doShowOrPick('>') td/platform/quickinput/browser/quickAccess.ts:45
               ────────┬─────────
                       │            ┌ return new QuickPick<T>(ui)  td/platform/quickinput/browser/quickInputController.ts:522
                       │    ────────┴────────
     this.quickInputService.createQuickPick() td/platform/quickinput/browser/quickAccess.ts:98
        this.controller.createQuickPick(); td/platform/quickinput/browser/quickInputService.ts:167
             ──┬───────
               └ QuickInputController
                 this.getUI(true) td/platform/quickinput/browser/quickInputController.ts:519:22
                 ──┬───────
┌──────────────────┴──────
│                 <div class="monaco-workbench"> toptest element
│                             ──────┴────────
│const container = dom.append(this._container, $('.quick-input-widget.show-file-icons')); td/platform/quickinput/browser/quickInputController.ts:103:39 
└────────────────
```
