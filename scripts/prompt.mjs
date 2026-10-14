// Questions for the test scripts. askSecret shows * instead of what you type,
// so a password never appears on the screen.
function read(question, secret) {
  return new Promise((resolve) => {
    const stdin = process.stdin
    process.stdout.write(question)
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''

    const finish = () => {
      stdin.setRawMode?.(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      process.stdout.write('\n')
      resolve(value)
    }

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish()
        if (ch === '\u0003') {
          process.stdout.write('\n')
          process.exit(1)
        }
        if (ch === '\u0008' || ch === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        value += ch
        process.stdout.write(secret ? '*' : ch)
      }
    }
    stdin.on('data', onData)
  })
}

export const ask = (question) => read(question, false)
export const askSecret = (question) => read(question, true)