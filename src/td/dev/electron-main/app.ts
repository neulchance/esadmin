/**
 * The main TD Dev application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class DevApplication /* extends Disposable */ {
  constructor() {
    console.log('init')
  }  
}