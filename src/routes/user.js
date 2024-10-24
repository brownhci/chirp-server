const express = require('express')
const router = express.Router()
const { authenticate } = require('./middleware/authenticate')
const update_usage_period = require('./middleware/update_usage_period')
const { generateName } = require('../utils/generate_name')
const groups = require('../utils/groups.json')

/**
 * Creates account
 * body: token - string
 * returns: userID of created user
 */
router.post('/user', async (req, res) => {
    const token = req.body.token
    const devAccount = token.includes('_dev')
    const randomName = generateName()
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            `INSERT INTO user (token, name, \`group\`) VALUES (?, ?, ?);
            SELECT LAST_INSERT_ID();`,
            [token, randomName, devAccount ? 'test_default' : null]
        )
        // set session id to our newly inserted id
        req.session.userID = rows[1][0]['LAST_INSERT_ID()']
        res.json({
            status: 200,
            result: { userID: req.session.userID },
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
 * Gets active user's posts
 * returns: array containing posts
 */
router.get(
    '/user/posts',
    authenticate,
    update_usage_period,
    async (req, res) => {
        const userID = req.session.userID
        const pool = req.app.get('pool')
        let conn
        try {
            conn = await pool.getConnection()
            const rows = await conn.query(
                `SELECT post.id, post.idInteraction, interaction.timeInteract AS timePosted, post.mainEmoji, post.storyEmojis
                FROM post, interaction, usage_period, user
                WHERE post.idInteraction = interaction.id AND interaction.idUsagePeriod = usage_period.id AND 
                usage_period.idUser = user.id AND user.id = ?`,
                [userID]
            )
            res.json({ status: 200, result: rows })
        } catch (error) {
            console.error(error)
            res.statusCode = 400
            res.json({ status: 400, result: error })
        } finally {
            if (conn) conn.release() //release to pool
        }
    }
)

/**
 * Resets user group
 */
router.post('/user/leave_group', authenticate, async (req, res) => {
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        await conn.query(
            `UPDATE user SET user.group = NULL WHERE user.id = ?`,
            [req.session.userID]
        )
        res.sendStatus(200)
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

/**
 * Sets user group
 * body: group_id - string
 */
router.post('/user/group', authenticate, async (req, res) => {
    // if (!(req.body.group_id in groups)) {
    //     res.statusCode = 400
    //     return res.json({ status: 400, result: 'Invalid group code' })
    // }
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const result = await conn.query(
            `SELECT * FROM user_group WHERE name = ?`,
            [req.body.group_id]
        )
        if (!result.length) {
            res.statusCode = 400
            return res.json({ status: 400, result: 'Invalid group code' })
        }
        await conn.query(`UPDATE user SET user.group = ? WHERE user.id = ?`, [
            req.body.group_id,
            req.session.userID,
        ])
        res.sendStatus(200)
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

/**
 * Creates notification for login page
 * body: none
 * returns: the notification for the login page as string
 */
router.get('/user/notification', async (req, res) => {
    try {
        return res.json({
            status: 200,
            result: "We've updated!\nCheck out our updated look and new avatars.",
        })
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    }
})

/*
  Gets the user name and avatar from the given user ID
*/
router.get('/user/:id', async (req, res) => {
    let uid = req.params.id
    let pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            `SELECT user.name, user.group FROM user WHERE user.id = ? LIMIT 1`,
            [uid]
        )
        const avatarUrl = 'https://api.dicebear.com/9.x/thumbs/png?scale=95&backgroundColor=0a5b83,1c799f,69d2e7,f1f4dc,f88c49,b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&translateY=5&seed=' + uid + rows[0].name
        if (!rows.length) {
            res.statusCode = 404
            res.json({
                status: 404,
                result: 'could not find a user with the specified uid',
            })
        } else {
            const result = rows[0]
            result.avatar = avatarUrl
            result.group_mode =
                result.group in groups ? groups[result.group].mode : 'full'
            res.json({ status: 200, result: result })
        }
    } catch (error) {
        console.error(error)
        res.statusCode = 400
        res.json({ status: 400, result: error })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

module.exports = router
