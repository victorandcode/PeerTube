/* eslint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import 'mocha'
import * as chai from 'chai'
import { cleanupTests, createSingleServer, PeerTubeServer, setAccessTokensToServers, setDefaultVideoChannel } from '@shared/extra-utils'
import { Video, VideoPlaylistPrivacy } from '@shared/models'

const expect = chai.expect

describe('Test services', function () {
  let server: PeerTubeServer = null
  let playlistUUID: string
  let playlistDisplayName: string
  let video: Video

  before(async function () {
    this.timeout(30000)

    server = await createSingleServer(1)

    await setAccessTokensToServers([ server ])
    await setDefaultVideoChannel([ server ])

    {
      const attributes = { name: 'my super name' }
      await server.videos.upload({ attributes })

      const { data } = await server.videos.list()
      video = data[0]
    }

    {
      const created = await server.playlists.create({
        attributes: {
          displayName: 'The Life and Times of Scrooge McDuck',
          privacy: VideoPlaylistPrivacy.PUBLIC,
          videoChannelId: server.store.channel.id
        }
      })

      playlistUUID = created.uuid
      playlistDisplayName = 'The Life and Times of Scrooge McDuck'

      await server.playlists.addElement({
        playlistId: created.id,
        attributes: {
          videoId: video.id
        }
      })
    }
  })

  it('Should have a valid oEmbed video response', async function () {
    for (const basePath of [ '/videos/watch/', '/w/' ]) {
      const oembedUrl = 'http://localhost:' + server.port + basePath + video.uuid

      const res = await server.services.getOEmbed({ oembedUrl })
      const expectedHtml = '<iframe width="560" height="315" sandbox="allow-same-origin allow-scripts" ' +
        `title="${video.name}" src="http://localhost:${server.port}/videos/embed/${video.uuid}" ` +
        'frameborder="0" allowfullscreen></iframe>'
      const expectedThumbnailUrl = 'http://localhost:' + server.port + video.previewPath

      expect(res.body.html).to.equal(expectedHtml)
      expect(res.body.title).to.equal(video.name)
      expect(res.body.author_name).to.equal(server.store.channel.displayName)
      expect(res.body.width).to.equal(560)
      expect(res.body.height).to.equal(315)
      expect(res.body.thumbnail_url).to.equal(expectedThumbnailUrl)
      expect(res.body.thumbnail_width).to.equal(850)
      expect(res.body.thumbnail_height).to.equal(480)
    }
  })

  it('Should have a valid playlist oEmbed response', async function () {
    for (const basePath of [ '/videos/watch/playlist/', '/w/p/' ]) {
      const oembedUrl = 'http://localhost:' + server.port + basePath + playlistUUID

      const res = await server.services.getOEmbed({ oembedUrl })
      const expectedHtml = '<iframe width="560" height="315" sandbox="allow-same-origin allow-scripts" ' +
        `title="${playlistDisplayName}" src="http://localhost:${server.port}/video-playlists/embed/${playlistUUID}" ` +
        'frameborder="0" allowfullscreen></iframe>'

      expect(res.body.html).to.equal(expectedHtml)
      expect(res.body.title).to.equal('The Life and Times of Scrooge McDuck')
      expect(res.body.author_name).to.equal(server.store.channel.displayName)
      expect(res.body.width).to.equal(560)
      expect(res.body.height).to.equal(315)
      expect(res.body.thumbnail_url).exist
      expect(res.body.thumbnail_width).to.equal(280)
      expect(res.body.thumbnail_height).to.equal(157)
    }
  })

  it('Should have a valid oEmbed response with small max height query', async function () {
    for (const basePath of [ '/videos/watch/', '/w/' ]) {
      const oembedUrl = 'http://localhost:' + server.port + basePath + video.uuid
      const format = 'json'
      const maxHeight = 50
      const maxWidth = 50

      const res = await server.services.getOEmbed({ oembedUrl, format, maxHeight, maxWidth })
      const expectedHtml = '<iframe width="50" height="50" sandbox="allow-same-origin allow-scripts" ' +
        `title="${video.name}" src="http://localhost:${server.port}/videos/embed/${video.uuid}" ` +
        'frameborder="0" allowfullscreen></iframe>'

      expect(res.body.html).to.equal(expectedHtml)
      expect(res.body.title).to.equal(video.name)
      expect(res.body.author_name).to.equal(server.store.channel.displayName)
      expect(res.body.height).to.equal(50)
      expect(res.body.width).to.equal(50)
      expect(res.body).to.not.have.property('thumbnail_url')
      expect(res.body).to.not.have.property('thumbnail_width')
      expect(res.body).to.not.have.property('thumbnail_height')
    }
  })

  after(async function () {
    await cleanupTests([ server ])
  })
})
