/** Get the current time. */
function time() {
  const now = new Date()
  return `${now.getHours()}:${now.getMinutes()}:${now.getMinutes()}`
}

function styleTime(color = '#777777') {
  return `font-weight:bold;color:#fff;background-color:${color};`
}

function styleBanner(color: string) {
  return `font-weight:bold;color:#fff;background-color:${color};`
}

function styleMessage(color: string) {
  return `font-weight:normal;color:${color};`
}

export class Logger {
  public banners

  constructor(banners?: string | string[]) {
    this.banners = Array.isArray(banners) ? banners : typeof banners === 'string' ? [banners] : ([] as string[])
  }

  public ok = this.create('log', ['#1cdc9a', '#1cdc9a'])
  public info = this.create('info', ['#1890ff', '#1890ff'])
  public warn = this.create('warn', ['#fdbc4b', '#fdbc4b'])
  public fail = this.create('error', ['#c0392b', '#c0392b'])
  public debug = this.create('debug', ['#777777', '#777777'])

  protected create(type: 'log' | 'info' | 'warn' | 'error' | 'debug', colors: [string, string], banners?: string | string[]) {
    const inBanners = Array.isArray(banners) ? banners : typeof banners === 'string' ? [banners] : []
    const print = (title: string, ...details: any[]) => {
      const bannerString = [...this.banners, ...inBanners].map((banner) => `[${banner}]`).join('')
      const content = `%c[${time()}]%c${bannerString}%c ${title}`
      const suffix = details?.length ? ['\n', ...details] : []

      // eslint-disable-next-line no-console
      console[type](content, styleTime(), styleBanner(colors[0]), styleMessage(colors[1]), ...suffix)
    }

    print.banner = (banners: string | string[], title: string, ...details: any[]) => {
      const print = this.create(type, colors, banners)
      print.call(this, title, details)
    }

    return print
  }
}
