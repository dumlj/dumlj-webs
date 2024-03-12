import { Logger } from '@/libs/Logger'

describe('Logger', () => {
  let logger: Logger

  beforeEach(() => {
    logger = new Logger()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should log messages with default colors', () => {
    const ok = jest.spyOn(console, 'log')
    const info = jest.spyOn(console, 'info')
    const warn = jest.spyOn(console, 'warn')
    const fail = jest.spyOn(console, 'error')
    const debug = jest.spyOn(console, 'debug')

    logger.ok('OK')
    logger.info('INFO')
    logger.warn('WARN')
    logger.fail('FAIL')
    logger.debug('DEBUG')

    expect(ok).toHaveBeenCalledTimes(1)
    expect(ok).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c%c OK/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#1cdc9a;/),
      expect.stringMatching(/font-weight:normal;color:#1cdc9a;/)
    )

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c%c INFO/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#1890ff;/),
      expect.stringMatching(/font-weight:normal;color:#1890ff;/)
    )

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c%c WARN/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#fdbc4b;/),
      expect.stringMatching(/font-weight:normal;color:#fdbc4b;/)
    )

    expect(fail).toHaveBeenCalledTimes(1)
    expect(fail).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c%c FAIL/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#c0392b;/),
      expect.stringMatching(/font-weight:normal;color:#c0392b;/)
    )

    expect(debug).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c%c DEBUG/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:normal;color:#777777;/)
    )
  })

  it('should log messages with custom colors', () => {
    const ok = jest.spyOn(console, 'log')
    const info = jest.spyOn(console, 'info')
    const warn = jest.spyOn(console, 'warn')
    const fail = jest.spyOn(console, 'error')
    const debug = jest.spyOn(console, 'debug')

    logger.ok.banner('BANNER', 'OK')
    logger.info.banner('BANNER', 'INFO')
    logger.warn.banner('BANNER', 'WARN')
    logger.fail.banner('BANNER', 'FAIL')
    logger.debug.banner('BANNER', 'DEBUG')

    expect(ok).toHaveBeenCalledTimes(1)
    expect(ok).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c\[BANNER\]%c OK/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#1cdc9a;/),
      expect.stringMatching(/font-weight:normal;color:#1cdc9a;/),
      '\n',
      []
    )

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c\[BANNER\]%c INFO/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#1890ff;/),
      expect.stringMatching(/font-weight:normal;color:#1890ff;/),
      '\n',
      []
    )

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c\[BANNER\]%c WARN/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#fdbc4b;/),
      expect.stringMatching(/font-weight:normal;color:#fdbc4b;/),
      '\n',
      []
    )

    expect(fail).toHaveBeenCalledTimes(1)
    expect(fail).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c\[BANNER\]%c FAIL/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#c0392b;/),
      expect.stringMatching(/font-weight:normal;color:#c0392b;/),
      '\n',
      []
    )

    expect(debug).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith(
      expect.stringMatching(/%c\[[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\]%c\[BANNER\]%c DEBUG/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:bold;color:#fff;background-color:#777777;/),
      expect.stringMatching(/font-weight:normal;color:#777777;/),
      '\n',
      []
    )
  })
})
