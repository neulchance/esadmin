import {SwcTranspiler} from './transpiler.mjs'

export function creaete() {
  const traspiler = new SwcTranspiler()
  traspiler.transpile()
}