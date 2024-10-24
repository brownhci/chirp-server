const express = require('express')
const router = express.Router()
const { authenticate } = require('./middleware/authenticate')
const update_usage_period = require('./middleware/update_usage_period')

/**
 * Makes a reaction
 * body: post_id - int, emoji - string
 * returns: react_id (id of newly created react)
 */
router.post(
    '/post/:post_id/reaction',
    authenticate,
    update_usage_period,
    async (req, res) => {
        const usagePeriodID = req.session.usagePeriodID
        const postID = req.params.post_id
        const emoji = req.body.emoji
        const pool = req.app.get('pool')
        let conn
        try {
            conn = await pool.getConnection()
            const rows = await conn.query(
                `INSERT INTO interaction (idUsagePeriod) VALUES (?);
                SET @cachedID = LAST_INSERT_ID();
                INSERT INTO react (idInteraction, idPost, reactEmoji, isRemove) VALUES
                (@cachedID, ?, ?, FALSE);
                SET @reactID = LAST_INSERT_ID();
                SELECT @reactID AS reactID;`,
                [usagePeriodID, postID, emoji]
            )
            const reactID = rows[4][0].reactID
            res.json({ status: true, result: { react_id: reactID } })
        } catch (error) {
            console.error(error)
            res.statusCode = 400
            res.json({ status: false, result: error })
        } finally {
            if (conn) conn.release() //release to pool
        }
    }
)

/**
 * Removes a reaction
 * body: post_id - int, emoji - string
 * returns: true if success, false if failed
 */
router.delete(
    '/post/:post_id/reaction',
    authenticate,
    update_usage_period,
    async (req, res) => {
        const usagePeriodID = req.session.usagePeriodID
        const postID = req.params.post_id
        const emoji = req.body.emoji
        const pool = req.app.get('pool')

        let conn
        try {
            conn = await pool.getConnection()
            await conn.query(
                `INSERT INTO interaction (idUsagePeriod) VALUES (?);
                SET @cachedID = LAST_INSERT_ID();
                INSERT INTO react (idInteraction, idPost, reactEmoji, isRemove) VALUES
                (@cachedID, ?, ?, TRUE)`,
                [usagePeriodID, postID, emoji]
            )
            res.statusCode = 204
            res.json({ status: 204 })
        } catch (error) {
            console.error(error)
            res.statusCode = 400
            res.json({ status: 400, result: error })
        } finally {
            if (conn) conn.release() //release to pool
        }
    }
)

module.exports = router
