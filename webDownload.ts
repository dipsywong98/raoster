import fs from 'fs'
import path from 'path'

const rewriter = new HTMLRewriter();

const remoteAttr = ['href', 'src']
const domains = new Set('localhost:8000')
const unknownDomains = new Set<string>()
const toFetch = new Set<string>()
const seen = new Set<string>()
const outputDir = 'website/toast/'

const urls = ['http://localhost:8000/w5.ab.ust.hk/wcq/cgi-bin/2320/index.html']


fs.mkdir(outputDir, { recursive: true }, (e) => {
  console.error(e)
})

const rationalize = (urlStr: string) => {
  const url = new URL(urlStr.replaceAll(/[&=?|# \s,;]+/g, '-').replaceAll(/(%\w\w)+/g, '-').replaceAll(/-+/g, '-').replace(/-$/, ''))
  return url.pathname
}

urls.forEach(url => {
  toFetch.add(url)
  seen.add(url)
})

let currentUrl = 'http://localhost:8000/w5.ab.ust.hk/wcq/cgi-bin/2320/index.html'

rewriter.on("*", {
  element(el) {
    // console.log(el.tagName); // "body" | "div" | ...
    // el.tagName = 'div'
    remoteAttr.forEach((attr) => {
      let urlStr = el.getAttribute(attr)
      if (urlStr === null) {
        return
      }
      console.log(`${el.tagName} ${attr} ${urlStr}`)

      if (urlStr.startsWith('http')) {
        const url = new URL(urlStr)
        console.log(`domain ${url.hostname}`)
        if (!domains.has(url.hostname) ) {
          unknownDomains.add(url.hostname)
          return
        }
      } else {
        urlStr = new URL(urlStr, currentUrl).href
        console.log(`derived ${urlStr}`)
      }
      const rationalized = rationalize(urlStr)
      el.setAttribute(attr, rationalized)
      if (!seen.has(urlStr)) {
        toFetch.add(urlStr)
        seen.add(urlStr)
      }
    })
  },
});

while (toFetch.size > 0) {
  const urlStr = toFetch.entries().next().value?.[0]
  if (urlStr === undefined ) {
    continue
  }
  toFetch.delete(urlStr)
  const res = await fetch(urlStr)
  const html = await res.text()
  currentUrl = urlStr
  const transformed = rewriter.transform(html);
  const url = new URL(urlStr)
  const ext = /(\.\w+)$/.exec(url.pathname)
  const contentType = res.headers.get('Content-Type')
  console.log(`url ${urlStr} content type ${contentType}`)
  const fileext = ext?.groups?.[1] ?? '.html'

  const filename = rationalize(urlStr)
  const outPath = path.join(outputDir, filename)
  // const dir = path.dirname(outPath)
  Bun.write(outPath, transformed, {createPath: true})
  // if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  // fs.writeFileSync(outPath, res)
}




// console.log(res)