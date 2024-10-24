const app = require('../../src/index.js')
const request = require('supertest')
const helpers = require('../testing_helpers')

describe('GET /posts (group)', function () {
    it('respects groups', async function () {
        let agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/group')
            .send({ name: 'test_1' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/user/group')
            .send({ group_id: 'test_1' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/post')
            .send({ main_emoji: '😇', emoji_string: '😇' })
            .set('Accept', 'application/json')
            .expect(200)
        let res = await agent
            .post('/post')
            .send({ main_emoji: '🤠', emoji_string: '😇🤠' })
            .set('Accept', 'application/json')
            .expect(200)
        agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        await agent
            .post('/user/group')
            .send({ group_id: 'test_1' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: -1 })
            .expect(200)
        res.body.result.length.should.equal(2)
        res.body.result[0].mainEmoji.should.equal('🤠')
        res.body.result[0].storyEmojis.should.equal('😇🤠')
        res.body.result[1].mainEmoji.should.equal('😇')
        res.body.result[1].storyEmojis.should.equal('😇')
        // Switch groups, should be no posts
        await agent
            .post('/group')
            .send({ name: 'test_2' })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/user/group')
            .send({ group_id: 'test_2' })
            .set('Accept', 'application/json')
            .expect(200)
        res = await agent
            .get('/posts')
            .query({ num_posts: 2, last_post_id: -1 })
            .expect(200)
        res.body.result.length.should.equal(0)
        // Fail on invalid group
        await agent
            .post('/user/group')
            .send({ group_id: 'test_3' })
            .set('Accept', 'application/json')
            .expect(400)
    })
})
