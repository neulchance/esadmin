src/bootstrap-amd.js:45
amdModulesPattern: /^vs\//, -> amdModulesPattern: /^td\//,
'vs'를 'td'로 바꾼 후에야 동작했다.


NODE_ENV=development TDDEV_DEV=1 VSCODE_DEV=1 VSCODE_CLI=1 ELECTRON_ENABLE_STACK_DUMPING=1 ELECTRON_ENABLE_LOGGING=1 npm run start
