const app = require('../../src/index.js')
const request = require('supertest')
const helpers = require('../testing_helpers')
const _ = require('lodash')

describe('GET /user/posts', function () {
    it('gets my posts', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🤠', emoji_string: '😇😇' })
            .set('Accept', 'application/json')
            .expect(200)
        const res = await agent.get('/user/posts').send().expect(200)
        res.body.result.length.should.equal(2)
    })
    it('returns nothing when no posts', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        const res = await agent.get('/user/posts').send().expect(200)
        res.body.result.length.should.equal(0)
    })
    it('fails if logged out', async function () {
        const agent = request.agent(app)
        await agent.get('/user/posts').send().expect(401)
    })
})

describe('GET /user', function () {
    it('gets user information', async function () {
        const agent = request.agent(app)
        const token = helpers.generateToken()
        const uid = await helpers.setupAccount(agent, token)
        const res = await agent
            .get('/user/' + uid)
            .query()
            .expect(200)
        res.body.result.name.should.not.be.empty()
        res.body.result.avatar.should.not.be.empty()
        res.body.result.avatar.includes(uid).should.be.true()
    })
    it('fails for invalid uids', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .get('/user/' + '-1')
            .query()
            .expect(404)
    })
})

describe('GET /user', function () {
    it('gets user information', async function () {
        const agent = request.agent(app)
        const token = helpers.generateToken()
        const uid = await helpers.setupAccount(agent, token)
        const res = await agent
            .get('/user/' + uid)
            .query()
            .expect(200)
        res.body.result.name.should.not.be.empty()
        res.body.result.avatar.should.not.be.empty()
    })
    it('fails for invalid uids', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .get('/user/' + '-1')
            .query()
            .expect(404)
    })
})

describe('GET /posts', function () {
    it('gets posts with no reactions', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        let res = await agent
            .post('/post')
            .send({ main_emoji: '🤠', emoji_string: '😇😇' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: pid + 1 })
            .expect(200)
        res.body.result.length.should.equal(2)
        res.body.result[0].mainEmoji.should.equal('🤠')
        res.body.result[0].storyEmojis.should.equal('😇😇')
        res.body.result[1].mainEmoji.should.equal('😇')
        res.body.result[1].storyEmojis.should.equal('🤠')
    })
    it('gets posts with my reaction', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        let res = await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 1, last_post_id: pid + 1 })
            .expect(200)
        res.body.result.length.should.equal(1)
        res.body.result[0].myReaction.should.equal('😀')
        _.isEqual(res.body.result[0].reactions, { '😀': 1 }).should.be.true()
    })
    it('gets post after other posts have been created and reacted to', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        let res = await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😀' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .post('/post')
            .send({ main_emoji: '🥶', emoji_string: '' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid2 = res.body.result.post_id
        await agent
            .post('/post/' + pid2 + '/reaction')
            .send({ emoji: '🤔' })
            .set('Accept', 'application/json')
            .expect(200)
        const agent2 = request.agent(app)
        await helpers.setupAccount(agent2, helpers.generateToken())
        await agent2
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '🤯' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent2
            .post('/post/' + pid2 + '/reaction')
            .send({ emoji: '🤯' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: -1 })
            .expect(200)
        res.body.result.length.should.equal(2)
        res.body.result[0].myReaction.should.equal('🤔')
        res.body.result[1].myReaction.should.equal('😀')
        _.isEqual(res.body.result[0].reactions, {
            '🤯': 1,
            '🤔': 1,
        }).should.be.true()
        _.isEqual(res.body.result[1].reactions, {
            '🤯': 1,
            '😀': 1,
        }).should.be.true()
    })
    it('counts reactions correctly', async function () {
        let agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        let res = await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '🥵' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 1, last_post_id: pid + 1 })
            .expect(200)
        res.body.result[0].myReaction.should.equal('🥵')
        _.isEqual(res.body.result[0].reactions, {
            '😇': 2,
            '🥵': 1,
        }).should.be.true()
    })
    it('fetches overwritten reactions', async function () {
        let agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        let res = await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        const pid = res.body.result.post_id
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '🧐' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '🧐' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post/' + pid + '/reaction')
            .send({ emoji: '🥵' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 1, last_post_id: pid + 1 })
            .expect(200)
        res.body.result[0].myReaction.should.equal('🥵')
        _.isEqual(res.body.result[0].reactions, {
            '🧐': 2,
            '🥵': 1,
        }).should.be.true()
    })
    it('respects reverse chronological order', async function () {
        let agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🤠', emoji_string: '🤠🤠🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🧐', emoji_string: '' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '🥵', emoji_string: '🥵🥵🥵' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        let res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: -1 })
            .expect(200)
        res.body.result.length.should.equal(2)
        res.body.result[0].mainEmoji.should.equal('🥵')
        res.body.result[0].storyEmojis.should.equal('🥵🥵🥵')
        res.body.result[1].mainEmoji.should.equal('🧐')
        res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: res.body.result[1].id })
            .expect(200)
        res.body.result[0].mainEmoji.should.equal('🤠')
        res.body.result[0].storyEmojis.should.equal('🤠🤠🤠')
        res.body.result[1].mainEmoji.should.equal('😇')
    })
    it('fails if logged out', async function () {
        let agent = request.agent(app)
        await agent
            .get('/posts')
            .query({ num_posts: 0, last_post_id: -1 })
            .expect(401)
    })
})
