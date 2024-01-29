import { task } from 'hereby'
import { rimraf, copyfile } from './utils.mjs'

export const local = task({
  name: "local",
  description: "Builds the full compiler and services",
  run: async () => {
    console.log('hereby hello!')
  }
})

export const delOut = task({
  name: "rimraf-out",
  description: "Delete out directory",
  run: async () => await rimraf('out')
})

export const taskWatchClient = task({
  name: "watch-client",
  description: "Builds the full compiler and services",
  // run: async () => (await import('./task-watch-client.mjs')).watch()
  run: async () => console.log('watch-client')
})

export const transpileSrc = task({
  name: "transpile-src",
  description: "Transpiles the src project (all code)",
  dependencies: [delOut],
  run: async () => {
    await copyfile('src/td/dev/electron-sandbox/workbench/workbench.html', 'out/td/dev/electron-sandbox/workbench/workbench.html'),
    await copyfile('src/td/base/browser/ui/codicons/codicon/codicon.ttf', 'out/td/base/browser/ui/codicons/codicon/codicon.ttf'),
    (await import('./tasks/facade.mjs')).transpile()
  }
})

export const watchSrc = task({
  name: "watch-src",
  description: "Watches the src project (all code)",
  dependencies:[transpileSrc],
  run: async () => (await import('./tasks/facade.mjs')).watch()
})
