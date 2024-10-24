/*
 * Creates account and logs in based on token and agent provided and returns the uid of the account
 */
const setupAccount = async (agent, token) => {
    const res = await agent
        .post('/user')
        .send({ token: token })
        .set('Accept', 'application/json')
        .expect(200)
    const uid = res.body.result.uid
    await agent
        .post('/login')
        .send({ token: token })
        .set('Accept', 'application/json')
        .expect(200)
    return uid
}

exports.setupAccount = setupAccount
