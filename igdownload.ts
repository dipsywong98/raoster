import { existsSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

export type IIgCreator = {
  id: string
  username: string
  followers_count: number
  profile_picture_url: string
  fileName: string
}

export type IIgPost = {
  id: string
  caption: string
  media_url: string
  fileName: string
  permalink: string
  username: string
  timestamp: string
  tags: string[]
  like_count: number
  children: Array<{
    id: string
    media_url: string,
    fileName: string
  }>
}

interface Result {
  posts: IIgPost[]
  creator: IIgCreator
}

const getContents = async function* (username: string, token: string, pageSize: number, after?: string): AsyncGenerator<Result> {
  const afterQuery = after ? `.after(${after})` : ''
  const url = `https://graph.facebook.com/v19.0/17841452154437470/?fields=business_discovery.username(${username}){id,followers_count,profile_picture_url,media${afterQuery}.limit(${pageSize}){caption,media_url,permalink,timestamp,username,like_count,children{media_url}}}&access_token=${token}`
  const resp = await fetch(url)
  const json: any = await resp.json()
  if (resp.status !== 200) {
    console.error(`error when getting ig content from ${username} after ${after}`)
    console.error(json)
  }
  const media = json?.business_discovery?.media
  const mediaData = media?.data as any[]
  const nextPage = media?.paging?.cursors?.after
  if (mediaData) {
    yield {
      posts: mediaData.map((post) => ({
        ...post,
        fileName: `img/ig/${post.id}.jpg`,
        children: post?.children?.data?.map((it: any) => ({
          ...it,
          fileName: `img/ig/${it.id}.jpg`
        })) ?? []
      })),
      creator: {
        id: json?.business_discovery?.id,
        username,
        followers_count: json?.business_discovery?.followers_count,
        profile_picture_url: json?.business_discovery?.profile_picture_url,
        fileName: `img/ig/${username}.jpg`
      }
    }
  }
  if (nextPage) {
    for await (const result of getContents(username, token, pageSize, nextPage)) {
      yield result
    }
  }
}

type DownloadImage = {
  src: string
  fileName: string
}

async function paginateContent() {
  const pageSize = 200
  const token = process.env.IG_TOKEN ?? ''
  const accounts = process.env.IG_ACCOUNTS?.split(',') ?? []
  const postUpsertResults = []
  // let tags = new Set<string>()
  const creators: IIgCreator[] = []
  const allPosts: IIgPost[] = []
  const downloadImages: DownloadImage[] = []
  await Promise.all(accounts.map(async (username) => {
    let page = 0
    for await (const { posts, creator: user } of getContents(username, token, pageSize)) {
      console.log(`importing page ${page} of ${username}, pageSize=${pageSize}`)
      // console.log(posts)
      creators.push(user)
      downloadImages.push(...posts.map((post) => ({
        src: post.media_url,
        fileName: post.fileName
      })))
      downloadImages.push(...posts.flatMap((post) => post.children.map((it) => ({
        src: it.media_url,
        fileName: it.fileName
      }))))
      page += 1
      // tags = new Set([...tags, ...posts.flatMap(post => extractTags(post.caption))])
      allPosts.push(...posts)
    }
  }))
  const uniqueCreators = creators.filter((user, k) => creators.findIndex((u) => u.id === user.id) === k)
  downloadImages.push(...uniqueCreators.map((creator) => ({
    src: creator.profile_picture_url,
    fileName: creator.fileName
  })))
  return {
    downloadImages,
    posts: allPosts,
    creators
  }
}

const downloadFile = async (url: string, fileName: string) => {
  if (existsSync(fileName)) {
    console.log(`${fileName} exists, skipping download`)
    return
  }
  console.log(`downloading ${__dirname}/${fileName} from ${url}`)
  // const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  // const fileStream = createWriteStream(fileName, { flags: 'wx' });
  // if (res.body) {
  //   await finished(Readable.fromWeb(res.body as any).pipe(fileStream));
  // }
  execSync(`curl "${url}" -o ${__dirname}/${fileName} --create-dirs`)
  console.log(`downloaded ${fileName} from ${url}`)
};

const excludeFields = <T>(t: T): T => t

const main = async () => {
  const { downloadImages, posts, creators } = await paginateContent()
  const queue: Array<() => Promise<void>> = downloadImages.map(downloadImage => (() => downloadFile(downloadImage.src, `cdn/${downloadImage.fileName}`)))

  writeFileSync('cdn/posts.json', JSON.stringify(excludeFields(posts), null, 2))
  writeFileSync('cdn/creators.json', JSON.stringify(excludeFields(creators), null, 2))

  const consumer = async () => {
    while (queue.length > 0) {
      console.log(`${queue.length} iamges left...`)
      await queue.pop()?.().catch(e => console.error(e))
    }
  }

  console.log('downloading image files')

  await Promise.all([consumer(), consumer(), consumer(), consumer()])
}

main()
