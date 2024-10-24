const app = require('../../src/index.js')
const request = require('supertest')
const helpers = require('../testing_helpers')

describe('POST /create_usage_period', function () {
    it('creates usage_period', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        const res = await agent.post('/usage_period').send().expect(200)
    })
    it('fails if logged out', async function () {
        const agent = request.agent(app)
        await agent.post('/logout').send()
        const res = await agent.post('/usage_period').send().expect(401)
    })
})

describe('POST /end_usage_period', function () {
    it('ends usage_period', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        const res = await agent.post('/usage_period').send().expect(200)
        const usagePeriodID = res.body.result.usagePeriodID
        await agent
            .post('/usage_period/end')
            .send()
            .set('Accept', 'application/json')
            .expect(204)
    })
    it('fails if usage_period does not exist', async function () {
        const agent = request.agent(app)
        await helpers.setupAccount(agent, helpers.generateToken())
        res = await agent
            .post('/usage_period/end')
            .send()
            .set('Accept', 'application/json')
            .expect(406)
    })
})
