import * as compilation from '../../lib/compilation'

async function main() {
  // compilation.compileTask('src', 'out', false)
  compilation.watchTask('out', false)
}

main()