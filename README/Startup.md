src/bootstrap-amd.js:45
amdModulesPattern: /^vs\//, -> amdModulesPattern: /^td\//,
'vs'를 'td'로 바꾼 후에야 동작했다.


NODE_ENV=development TDDEV_DEV=1 VSCODE_DEV=1 VSCODE_CLI=1 ELECTRON_ENABLE_STACK_DUMPING=1 ELECTRON_ENABLE_LOGGING=1 npm run start


vscode 에디터의 'UI'에는 'workbench'라는 명칭이 붙어 있다.

# createPart
src/td/workbench/browser/workbench.ts
fn:renderWorkbench





┏
┃┌
┃│
┃└─────
┃┌workbench.common.main.ts
┃│td/workbench/browser/parts/paneCompositePartService
┃│└>td/workbench/browser/parts/activitybar/activitybarPart
┃│  └>td/workbench/browser/parts/sidebar/sidebarPart
┃└─────
┗━━━━━

this.getStoredPinnedViewContainersValue();
.pinnedViewContainersKey