const app = require('../../src/index.js')
const request = require('supertest')
const helpers = require('../testing_helpers')

require('chai')
require('assert')
require('should')

describe('POST /user', function () {
    it('creates account', async function () {
        const agent = request.agent(app)
        const res = await agent
            .post('/user')
            .send({ token: helpers.generateToken() })
            .set('Accept', 'application/json')
            .expect(200)
        res.body.result.userID.should.equal(1)
    })
    it('fails if account exists', async function () {
        const agent = request.agent(app)
        const token = helpers.generateToken()
        const res = await agent
            .post('/user')
            .send({ token: token })
            .set('Accept', 'application/json')
            .expect(200)
        res.body.result.userID.should.equal(2)
        await agent
            .post('/user')
            .send({ token: token })
            .set('Accept', 'application/json')
            .expect(400)
    })
})

describe('POST /login', function () {
    it('logs user in', async function () {
        const agent = request.agent(app)
        const token = helpers.generateToken()
        await agent
            .post('/user')
            .send({ token: token })
            .set('Accept', 'application/json')
            .expect(200)
        await agent
            .post('/login')
            .send({ token: token })
            .set('Accept', 'application/json')
            .expect(200)
    })
    it('invalid logins fail', async function () {
        const agent = request.agent(app)
        await agent
            .post('/login')
            .send({ token: helpers.generateToken() })
            .set('Accept', 'application/json')
            .expect(401)
    })
})
