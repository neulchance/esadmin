import * as compilation from '../../lib/compilation'

async function main() {
  compilation.transpileTask('src', 'out', true)
}

main()