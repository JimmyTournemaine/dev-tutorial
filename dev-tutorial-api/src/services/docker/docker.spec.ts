/* eslint-disable no-invalid-this */
import { expect } from 'chai'
import { describe } from 'mocha'
import { environment } from '../../environments/environment'
import { DemuxStream, DockerService as docker } from './docker'
import * as fs from 'fs'
import { fail } from 'assert'
import { debug } from 'debug'

const logger = debug('test:docker')

describe('Docker Service', function () {
  describe('Docker service initialization', function () {
    it('should the docker service throw error without connection', function () {
      docker.disconnect()
      expect(docker.getInstance).to.throw
    })

    it('should the docker service works and be unique', function () {
      const service = docker.connect(environment.docker)
      expect(service).not.to.be.undefined

      const instance = docker.getInstance()
      expect(instance).not.to.be.null
      expect(instance).to.equals(service)
    })
  })

  describe('Docker basic container features', function () {
    const tutoId = 'dev'
    this.timeout(120000)

    before(() => docker.connect(environment.docker))
    beforeEach(async function () {
      await docker.getInstance().destroy(tutoId)
    })

    it('should start a tutorial container, then stop and remove it', async function () {
      // Start
      logger('starting')
      const container = await docker.getInstance().run(tutoId)
      expect(container).not.to.be.undefined
      expect(container).to.have.property('id')

      // Check start status
      logger('inspect')
      const inspect = await container.inspect()
      expect(inspect).to.have.nested.property('State.Status').that.equals('running')
      expect(inspect).to.have.nested.property('State.Running').that.is.true
      expect(inspect).to.have.nested.property('State.Dead').that.is.false

      // Stop/Remove
      logger('destroy')
      await docker.getInstance().destroy(tutoId)
    })
  })
  describe('Docker advanced container features', function () {
    const tutoId = 'dev'
    this.timeout(120000)

    before(() => docker.connect(environment.docker))
    beforeEach(async function () {
      await docker.getInstance().run(tutoId)
    })
    afterEach(async function () {
      this.timeout(120000)
      setTimeout(async () => {
        await docker.getInstance().destroy(tutoId)
      }, 110000)
    })

    it('should write a file in the container', function (done) {
      // Write a file in the container
      docker.getInstance().writeFile(tutoId, '/root/test_writeFile.txt', fs.createReadStream('./test/test-file.txt'))
        .then(() => {
          docker.getInstance().exec(tutoId, 'cat /root/test_writeFile.txt').then((stream: DemuxStream) => {
            const chunks = []
            stream.onOut((data: Buffer) => { chunks.push(data) })
            stream.onErr((err: any) => fail(err))
            stream.onClose(() => {
              const expected = 'This file should be extracted in a container during a test'
              const catResult = Buffer.concat(chunks).toString()
              expect(catResult).to.equals(expected)
              done()
            })
          })
        })
    })
  })
})
