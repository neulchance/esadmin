import { task } from 'hereby'
import {creaete} from './lib/tsb/index.mjs'

export const hello = task({
  name: "hello",
  description: "Builds the full compiler and services",
  run: async () => {
    console.log('hereby hello!')
    creaete()
  }
})

export const local = task({
  name: "local",
  description: "Builds the full compiler and services",
  run: async () => {
    console.log('hereby hello!')
    creaete()
  }
})

export const other = task({
  name: "other",
  description: "Builds the full compiler and services",
  run: async () => {
    console.log('hereby hello!')
    // createCompiler()
  }
})

export const taskWatchClient = task({
  name: "watch-client",
  description: "Builds the full compiler and services",
  run: async () => (await import('./task-watch-client.mjs')).watch()
})

export const watchSrc = task({
  name: "watch-src",
  description: "Watches the src project (all code)",
  run: async () => (await import('./task-watch-client.mjs')).watch()
})