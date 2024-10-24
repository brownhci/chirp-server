const app = require('../../src/index.js')
const request = require('supertest')
const helpers = require('../testing_helpers')

describe('POST /make_post', function () {
    it('makes posts', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🙂', emoji_string: '🤗🤩🤔' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🙂', emoji_string: '' })
            .set('Accept', 'application/json')
            .expect(200)
    })
    it('fails if logged out', async function () {
        const agent = request.agent(app)
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(401)
    })
})

describe('POST /make_reaction', function () {
    it('makes reactions', async function () {
        // More related tests found in interaction_get_tests
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        const res = await agent
            .post('/post')
            .send({ main_emoji: '🙂', emoji_string: '🤗🤩🤔' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(200)
    })
    it('fails when post does not exist', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post/-4/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(400)
    })
    it('fails if logged out', async function () {
        const agent = request.agent(app)
        await agent
            .post('/post/1/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(401)
    })
})

describe('POST /remove_reaction', function () {
    it('removes reactions', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        const res = await agent
            .post('/post')
            .send({ main_emoji: '🙂', emoji_string: '🤗🤩🤔' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .delete('/post/' + pid + '/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(204)
    })
    it('fails if post does not exist', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .delete('/post/-4/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(400)
    })
    it('fails if logged out', async function () {
        const agent = request.agent(app)
        await agent
            .delete('/post/1/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(401)
    })
})
