const { v4: uuidv4 } = require('uuid')

/*
 * Creates account and logs in based on token and agent provided and returns the userID of the account
 */
const setupAccount = async (agent, token) => {
    const res = await agent
        .post('/user')
        .send({ token: token })
        .set('Accept', 'application/json')
        .expect(200)
    const userID = res.body.result.userID
    await agent
        .post('/login')
        .send({ token: token })
        .set('Accept', 'application/json')
        .expect(200)
    return userID
}

/*
 * Generates a random token
 */
const generateToken = () => {
    return uuidv4()
}

exports.setupAccount = setupAccount
exports.generateToken = generateToken
