import pino from 'pino'

export const logger = pino({
  transport: {
    target: 'pino-pretty', /* KIM: Installed package pino-pretty */
    options: {
      ignore: 'pid,hostname',
      colorize: true
    }
  }
})