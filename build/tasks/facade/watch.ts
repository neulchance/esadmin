import * as compilation from '../../lib/compilation'

async function main() {
  compilation.watchTask('out', false)
}

main()