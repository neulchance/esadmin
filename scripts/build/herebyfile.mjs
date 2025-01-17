import {task} from 'hereby'
import {rimraf} from './utils.mjs'

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

export const copyFiles = task({
  name: "copyfiles",
  description: "Copy non-code files to out directory",
  dependencies: [delOut],
  run: async () => {
    (await import('./tasks/facade.mjs')).copyFiles(['css', 'html', 'svg', 'png', 'ttf', 'json'])
  }
})

export const transpileSrc = task({
  name: "transpile-src",
  description: "Transpiles the src project (all code)",
  dependencies: [delOut, copyFiles],
  run: async () => {
    (await import('./tasks/facade.mjs')).transpile()
  }
})

export const watchSrc = task({
  name: "watch-src",
  description: "Watches the src project (all code)",
  dependencies:[transpileSrc],
  run: async () => (await import('./tasks/facade.mjs')).watch()
})
