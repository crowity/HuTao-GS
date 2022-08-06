import EventEmitter from 'promise-events'
import { formatWithOptions } from 'util'
import { ReadStream, WriteStream } from 'tty'

const MAX_HISTORY_COUNT = 10

export const ColorPalette = [
  0x000000, 0x800000, 0x008000, 0x808000, 0x000080, 0x800080, 0x008080, 0xC0C0C0, 0x808080, 0xFF0000, 0x00FF00, 0xFFFF00, 0x0000FF, 0xFF00FF, 0x00FFFF, 0xFFFFFF,
  0x000000, 0x00005F, 0x000087, 0x0000AF, 0x0000D7, 0x0000FF, 0x005F00, 0x005F5F, 0x005F87, 0x005FAF, 0x005FD7, 0x005FFF, 0x008700, 0x00875F, 0x008787, 0x0087AF,
  0x0087D7, 0x0087FF, 0x00AF00, 0x00AF5F, 0x00AF87, 0x00AFAF, 0x00AFD7, 0x00AFFF, 0x00D700, 0x00D75F, 0x00D787, 0x00D7AF, 0x00D7D7, 0x00D7FF, 0x00FF00, 0x00FF5F,
  0x00FF87, 0x00FFAF, 0x00FFD7, 0x00FFFF, 0x5F0000, 0x5F005F, 0x5F0087, 0x5F00AF, 0x5F00D7, 0x5F00FF, 0x5F5F00, 0x5F5F5F, 0x5F5F87, 0x5F5FAF, 0x5F5FD7, 0x5F5FFF,
  0x5F8700, 0x5F875F, 0x5F8787, 0x5F87AF, 0x5F87D7, 0x5F87FF, 0x5FAF00, 0x5FAF5F, 0x5FAF87, 0x5FAFAF, 0x5FAFD7, 0x5FAFFF, 0x5FD700, 0x5FD75F, 0x5FD787, 0x5FD7AF,
  0x5FD7D7, 0x5FD7FF, 0x5FFF00, 0x5FFF5F, 0x5FFF87, 0x5FFFAF, 0x5FFFD7, 0x5FFFFF, 0x870000, 0x87005F, 0x870087, 0x8700AF, 0x8700D7, 0x8700FF, 0x875F00, 0x875F5F,
  0x875F87, 0x875FAF, 0x875FD7, 0x875FFF, 0x878700, 0x87875F, 0x878787, 0x8787AF, 0x8787D7, 0x8787FF, 0x87AF00, 0x87AF5F, 0x87AF87, 0x87AFAF, 0x87AFD7, 0x87AFFF,
  0x87D700, 0x87D75F, 0x87D787, 0x87D7AF, 0x87D7D7, 0x87D7FF, 0x87FF00, 0x87FF5F, 0x87FF87, 0x87FFAF, 0x87FFD7, 0x87FFFF, 0xAF0000, 0xAF005F, 0xAF0087, 0xAF00AF,
  0xAF00D7, 0xAF00FF, 0xAF5F00, 0xAF5F5F, 0xAF5F87, 0xAF5FAF, 0xAF5FD7, 0xAF5FFF, 0xAF8700, 0xAF875F, 0xAF8787, 0xAF87AF, 0xAF87D7, 0xAF87FF, 0xAFAF00, 0xAFAF5F,
  0xAFAF87, 0xAFAFAF, 0xAFAFD7, 0xAFAFFF, 0xAFD700, 0xAFD75F, 0xAFD787, 0xAFD7AF, 0xAFD7D7, 0xAFD7FF, 0xAFFF00, 0xAFFF5F, 0xAFFF87, 0xAFFFAF, 0xAFFFD7, 0xAFFFFF,
  0xD70000, 0xD7005F, 0xD70087, 0xD700AF, 0xD700D7, 0xD700FF, 0xD75F00, 0xD75F5F, 0xD75F87, 0xD75FAF, 0xD75FD7, 0xD75FFF, 0xD78700, 0xD7875F, 0xD78787, 0xD787AF,
  0xD787D7, 0xD787FF, 0xD7AF00, 0xD7AF5F, 0xD7AF87, 0xD7AFAF, 0xD7AFD7, 0xD7AFFF, 0xD7D700, 0xD7D75F, 0xD7D787, 0xD7D7AF, 0xD7D7D7, 0xD7D7FF, 0xD7FF00, 0xD7FF5F,
  0xD7FF87, 0xD7FFAF, 0xD7FFD7, 0xD7FFFF, 0xFF0000, 0xFF005F, 0xFF0087, 0xFF00AF, 0xFF00D7, 0xFF00FF, 0xFF5F00, 0xFF5F5F, 0xFF5F87, 0xFF5FAF, 0xFF5FD7, 0xFF5FFF,
  0xFF8700, 0xFF875F, 0xFF8787, 0xFF87AF, 0xFF87D7, 0xFF87FF, 0xFFAF00, 0xFFAF5F, 0xFFAF87, 0xFFAFAF, 0xFFAFD7, 0xFFAFFF, 0xFFD700, 0xFFD75F, 0xFFD787, 0xFFD7AF,
  0xFFD7D7, 0xFFD7FF, 0xFFFF00, 0xFFFF5F, 0xFFFF87, 0xFFFFAF, 0xFFFFD7, 0xFFFFFF, 0x080808, 0x121212, 0x1C1C1C, 0x262626, 0x303030, 0x3A3A3A, 0x444444, 0x4E4E4E,
  0x585858, 0x626262, 0x6C6C6C, 0x767676, 0x808080, 0x8A8A8A, 0x949494, 0x9E9E9E, 0xA8A8A8, 0xB2B2B2, 0xBCBCBC, 0xC6C6C6, 0xD0D0D0, 0xDADADA, 0xE4E4E4, 0xEEEEEE
]

const codeRegexp = /\x1b(.*?)m/ // NOSONAR
const codeRegexpG = /\x1b(.*?)m/g // NOSONAR

const cache: { [rgb: number]: number } = {}

export function rgbToCode(rgb: number) {
  if (cache[rgb]) return cache[rgb]

  const result = ColorPalette.map((c, i) => {
    const rDiff = Math.abs(((c >> 16) & 0xFF) - ((rgb >> 16) & 0xFF))
    const gDiff = Math.abs(((c >> 8) & 0xFF) - ((rgb >> 8) & 0xFF))
    const bDiff = Math.abs((c & 0xFF) - (rgb & 0xFF))

    return [i, (rDiff + gDiff + bDiff) / 3]
  }).sort((a, b) => a[1] - b[1])[0][0]

  cache[rgb] = result

  return result
}

export function cCode(code: number, str: string): string {
  return `\x1b[38;5;${code}m${str}\x1b[m`
}

export function cRGB(rgb: number, str: string): string {
  return cCode(rgbToCode(rgb), str)
}

export function ansiToHTML(str: string): string {
  let started = false
  let match: RegExpMatchArray
  while (match = str.match(codeRegexp)) {
    str = str.replace(codeRegexp, () => {
      const code = match[1].slice(1).split(';').map(s => parseInt(s))
      let prefix = ''

      if (started) prefix += '</span>'

      if (code[0] === 38 && code[1] === 5) {
        started = true

        const color = ColorPalette[code[2]]
        return `${prefix}<span style="color:rgba(${(color >> 16) & 0xFF},${(color >> 8) & 0xFF},${color & 0xFF},1)">`
      }

      return prefix
    })
  }

  if (started) str += '</span>'

  return str
}

export function noColor(str: string): string {
  return str.replace(codeRegexpG, '')
}

export class TTY extends EventEmitter {
  stdin: ReadStream
  stdout: WriteStream

  input: {
    prompt: string
    cursor: number
    rowSpan: number
    buffer: string[]
    history: string[]
    historyIndex: number
  }

  constructor(stdin?: ReadStream, stdout?: WriteStream) {
    super()

    this.stdin = stdin || process.stdin
    this.stdout = stdout || process.stdout

    this.input = {
      prompt: '>>',
      cursor: 0,
      rowSpan: 0,
      buffer: [],
      history: [],
      historyIndex: null
    }

    this.stdin.setRawMode(true)
    this.stdin.resume()
    this.stdin.setEncoding('utf8')
    this.stdin.on('data', this.handleInput.bind(this))
    this.stdout.on('resize', this.handleResize.bind(this))

    const ownPropNames = Object.getOwnPropertyNames(this.constructor.prototype)
    for (const name of ownPropNames) {
      if (typeof this[name] === 'function') this[name] = this[name].bind(this)
    }
  }

  write(str: string) {
    this.stdout.write(str)
  }

  print(...args: any[]): string {
    const formatted = formatWithOptions({ colors: true }, ...args)

    this.clearLine()
    this.write(formatted + '\n\r')
    this.updateInput()

    return formatted
  }

  clearLine(count: number = 1) {
    if (count > 1) this.write(`\x1b[${count - 1}F`)
    this.write('\x1b[G\x1b[J')
  }

  updateInput() {
    const { stdout, input } = this
    const { columns } = stdout
    const { prompt, cursor, rowSpan, buffer } = input

    this.clearLine(rowSpan)
    this.write(`\x1b[97m${prompt}${buffer.join('')}\x1b[m\x1b[${((prompt.length + cursor) % columns) + 1}G`)

    this.updateRowSpan()
  }

  updateRowSpan() {
    const { stdout, input } = this
    const { columns } = stdout
    const { prompt, buffer } = input

    input.rowSpan = Math.floor(((prompt.length + buffer.join('').length) - 1) / columns) + 1
  }

  prevCmd() {
    const { input } = this
    const { buffer, history, historyIndex } = input

    if (history.length <= 0) return

    // clear buffer
    buffer.splice(0)

    const index = Math.max(0, historyIndex == null ? history.length - 1 : historyIndex - 1)
    input.historyIndex = index
    input.cursor = 0

    buffer.push(...history[index].split(''))

    this.updateInput()
  }

  nextCmd() {
    const { input } = this
    const { buffer, history, historyIndex } = input

    if (history.length <= 0 || historyIndex == null) return

    // clear buffer
    buffer.splice(0)

    const index = historyIndex + 1
    input.historyIndex = index >= history.length ? null : index
    input.cursor = 0

    if (index < history.length) buffer.push(...history[index].split(''))

    this.updateInput()
  }

  pushHistory(line: string) {
    if (line.trim().length <= 0) return

    const { history } = this.input

    while (history.length > MAX_HISTORY_COUNT) history.shift()
    history.push(line)
  }

  handleInput(data: string) {
    const { input } = this
    const { cursor, buffer } = input

    let resetHI = true

    switch (data) {
      case '\x03': { // ctrl-c
        this.emit('exit')
        break
      }
      case '\x08': { // backspace
        if (buffer.length <= 0 || cursor <= 0) break

        buffer.splice(cursor - 1, 1)
        input.cursor--

        this.updateInput()
        break
      }
      case '\x0d': { // carriage return
        if (buffer.join('').trim().length <= 0) break

        const line = buffer.splice(0, buffer.length).join('')
        input.cursor = 0

        this.emit('line', line)

        this.pushHistory(line)
        this.updateInput()
        break
      }
      case '\x09': { // tab
        resetHI = false
        break
      }
      case '\x1b[A': { // cursor up
        resetHI = false
        this.prevCmd()
        break
      }
      case '\x1b[B': { // cursor down
        resetHI = false
        this.nextCmd()
        break
      }
      case '\x1b[C': { // cursor forward
        resetHI = false
        if (cursor >= buffer.length) break

        input.cursor++
        this.write('\x1b[C')
        break
      }
      case '\x1b[D': { // cursor back
        resetHI = false
        if (cursor <= 0) break

        input.cursor--
        this.write('\x1b[D')
        break
      }
      default: {
        const char = data.split('')

        buffer.splice(cursor, 0, ...char)
        input.cursor += char.length

        this.updateInput()
      }
    }

    if (resetHI) input.historyIndex = null
  }

  handleResize() {
    this.updateRowSpan()
  }
}

let TTYInstance: TTY = null

export const getTTY = (stdin?: ReadStream, stdout?: WriteStream) => {
  if (!TTYInstance) {
    TTYInstance = new TTY(stdin, stdout)
  }

  console.log = TTYInstance.print

  return TTYInstance
}

export default getTTY