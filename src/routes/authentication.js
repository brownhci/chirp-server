const express = require('express')
// eslint-disable-next-line new-cap
const router = express.Router()

/**
 * Logs user in
 * body: token - string
 * returns: userID of logged in user
 */
router.post('/login', async (req, res) => {
    const pool = req.app.get('pool')
    const token = req.body.token
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            `SELECT id FROM user WHERE token = ? LIMIT 1`,
            [token]
        )
        req.session.userID = rows[0].id
        req.session.usagePeriodID = undefined // reset session
        res.json({
            status: 200,
            result: { userID: req.session.userID },
        })
    } catch (error) {
        console.error(error)
        res.statusCode = 401
        res.json({ status: 401, result: error })
    } finally {
        if (conn) conn.release()
    }
})

/**
 * Logs user out
 * body: none
 * returns: none
 */
router.post('/logout', (req, res) => {
    // reset userID
    if (req.session.userID) {
        req.session.userID = undefined
        res.statusCode = 204
        res.json({ status: 204 })
    } else {
        res.statusCode = 401
        res.json({ status: 401, result: 'User is not logged in' })
    }
})

module.exports = router
