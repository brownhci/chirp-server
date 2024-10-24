const express = require('express')
const router = express.Router()
const { authenticate } = require('./middleware/authenticate')

/**
 * Creates usage_period for user
 * body: none
 * returns: usagePeriodID (id of usage_period)
 */
router.post('/usage_period', authenticate, async (req, res) => {
    const usagePeriodID = req.sessionID
    // true server session IDs are stored for data purposes under uidSession
    const userID = req.session.userID
    // Preliminarily set expiration time
    const expiration =
        new Date().getTime() + parseInt(process.env.USAGE_PERIOD_EXPIRATION)
    const datetime = new Date(expiration)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            `INSERT INTO usage_period (uidSession, idUser, timeEnd) VALUES (?,?,?);
        SET @cachedID = LAST_INSERT_ID();
        SELECT @cachedID AS usagePeriodID`,
            [usagePeriodID, userID, datetime]
        )
        req.session.usagePeriodID = rows[2][0].usagePeriodID
        req.session.expiration = datetime
        res.json({
            status: 200,
            result: { usagePeriodID: req.session.usagePeriodID },
        })
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

/**
 * Terminates current usage_period
 * body: usagePeriodID - int
 * returns: none
 */
router.post('/usage_period/end', authenticate, async (req, res) => {
    const usagePeriodID = req.session.usagePeriodID
    if (usagePeriodID === undefined) {
        res.statusCode = 406
        res.json({ status: 406, result: 'Usage period has not been opened' })
    }
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        await conn.query(
            `UPDATE usage_period SET timeEnd = CURRENT_TIMESTAMP WHERE id = ?`,
            [usagePeriodID]
        )
        req.session.usagePeriodID = undefined
        res.statusCode = 204
        res.json({ status: 204 })
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

module.exports = router
