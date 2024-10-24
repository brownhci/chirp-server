const express = require('express')
const router = express.Router()
const { authenticateAdmin } = require('./middleware/authenticate')
const groups = require('../utils/groups_dashboard.json')
const { joinImages } = require('join-images')
var path = require('path')
const { v4 } = require('uuid')
var moment = require('moment')

/**
 * Logs admin user in
 * body: password - string
 */
router.post('/login/admin', (req, res) => {
    const password = req.body.password
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.admin = true
        return res.redirect('/dashboard/groups')
    }
    res.redirect('/dashboard/login')
})

router.get('/dashboard/login', (req, res) => {
    res.render('login')
})

router.get('/dashboard/groups', authenticateAdmin, (req, res) => {
    res.render('groups', { groups: Object.keys(groups) })
})

router.get(
    '/dashboard/timeline/:group_id',
    authenticateAdmin,
    async (req, res) => {
        const pool = req.app.get('pool')
        let conn
        try {
            conn = await pool.getConnection()
            const rows = await conn.query(
                `SELECT post.id, user.id AS userID, user.name AS userName, interaction.timeInteract AS postTime, post.mainEmoji, post.storyEmojis,
                (SELECT CONCAT('{', 
                    GROUP_CONCAT(CONCAT('"', react_count.react_emoji, '"', ':', react_count.emoji_count)), 
                    '}') FROM react_count WHERE react_count.post_id = post.id) AS reactions
                FROM post, interaction, usage_period, user
                WHERE post.idInteraction = interaction.id AND interaction.idUsagePeriod = usage_period.id AND usage_period.idUser = user.id
                AND user.group = ? ORDER BY post.id DESC`,
                [req.params.group_id]
            )
            const users = await conn.query(
                `SELECT user.id, user.name,
                (SELECT interaction.timeInteract from interaction 
                LEFT JOIN usage_period ON usage_period.id = interaction.idUsagePeriod 
                WHERE usage_period.idUser = user.id
                ORDER BY interaction.timeInteract DESC LIMIT 1) AS lastActive 
                FROM user, interaction WHERE user.group = ? GROUP BY user.id`,
                [req.params.group_id]
            )
            users.map((user) => {
                if (user.lastActive) {
                    user.lastActive = moment(user.lastActive).fromNow()
                }
            })
            for (let i = 0; i < rows.length; i++) {
                rows[i].reactions = JSON.parse(rows[i].reactions)
                rows[i].avatar =
                    'https://gravatar.com/avatar/' +
                    rows[i].userID +
                    '?s=400&d=identicon&r=x'
            }

            // will not return anything if count is 0 so output manip must be done
            // get number of active users in past (period) days
            const getActiveUsers = async (period) => {
                const res = await conn.query(
                    `SELECT COUNT(distinct usage_period.idUser) AS activeUsers from interaction 
                LEFT JOIN usage_period ON usage_period.id = interaction.idUsagePeriod 
                LEFT JOIN user ON usage_period.idUser = user.id 
                WHERE interaction.timeInteract >= (NOW() - INTERVAL ? DAY) 
                AND user.group = ?`,
                    [period, req.params.group_id]
                )
                return res[0]?.activeUsers || 0
            }

            // get total number of posts in past (period) days
            const getTotalPosts = async (period) => {
                const res = await conn.query(
                    `SELECT COUNT(*) AS posts from post 
                LEFT JOIN interaction ON interaction.id = post.idInteraction
                LEFT JOIN usage_period ON usage_period.id = interaction.idUsagePeriod 
                LEFT JOIN user ON usage_period.idUser = user.id 
                WHERE interaction.timeInteract >= (NOW() - INTERVAL ? DAY) 
                AND user.group = ?`,
                    [period, req.params.group_id]
                )
                return res[0]?.posts || 0
            }
            const periods = [365, 28, 21, 14, 7, 1]
            const activeUsers = await Promise.all(
                periods.map(async (period) => await getActiveUsers(period))
            )
            const averagePosts = await Promise.all(
                periods.map(
                    async (period, index) =>
                        (await getTotalPosts(period)) / activeUsers[index] || 0
                )
            )

            // get array of objects of the form {cohort: <NAME_OF_COHORT>, users: [{createdAgo: _, activeAgo: _}]}
            const getCohort = async () => {
                // TODO: rewrite query
                const res = await conn.query(
                    `WITH temp AS (
                    SELECT ordered.*, ROW_NUMBER() OVER (PARTITION BY id ORDER BY last_active DESC) AS rn
                    FROM (SELECT user.id as id, user.created_at as created_at, interaction.timeInteract as last_active from interaction 
                        LEFT JOIN usage_period ON usage_period.id = interaction.idUsagePeriod 
                        LEFT JOIN user ON usage_period.idUser = user.id AND user.group = ?) AS ordered)
                    SELECT * FROM temp WHERE rn = 1 ORDER BY created_at DESC;`,
                    [req.params.group_id]
                )
                const numCohorts = 10 // number of cohorts in view (max weeks / days in past)
                const now = moment()
                const users = {} // map of users created in week (key)
                // init activeUsers (first level is app launched, second is % active)
                const activeUsers = {}
                for (let i = 0; i <= numCohorts; i++) {
                    users[i] = 0
                    activeUsers[i] = {}
                    for (let j = 0; j <= numCohorts; j++) {
                        activeUsers[i][j] = 0
                    }
                }
                // populate cohort (can switch between 'days' and 'weeks')
                for (const row of res) {
                    createdAgo = now.diff(moment(row.created_at), 'weeks')
                    if (createdAgo in users) {
                        users[createdAgo]++

                        activeAgo = now.diff(moment(row.last_active), 'weeks')
                        // i++ because more weeks ago
                        for (let i = activeAgo; i <= numCohorts; i++) {
                            activeUsers[createdAgo][i]++
                        }
                    }
                }
                // process data into array
                const cohortProcessed = []
                // i is each cohort j is each week
                for (let i = 0; i <= numCohorts; i++) {
                    const temp = {
                        cohort: `Week of ${now
                            .subtract(7, 'd')
                            .format('MMM DD')}`,
                        users: users[i],
                    }
                    for (j = 0; j <= numCohorts; j++) {
                        temp[`Week ${j}`] = `${
                            Math.round(
                                (activeUsers[i][numCohorts - j] / users[i] ||
                                    0) * 100
                            ) / 100
                        }`
                    }
                    cohortProcessed.unshift(temp)
                }
                // force cohort to conform to expectations (100% retention on 0 and no entries where appropriate)
                // for (let i = 0; i < cohortProcessed.length; i++) {
                //     cohortProcessed[i][`Week 0`] = 1
                //     for (let j = numCohorts - i + 1; j <= numCohorts; j++) {
                //         cohortProcessed[i][`Week ${j}`] = ''
                //     }
                // }
                return cohortProcessed
            }
            res.render('timeline', {
                rows,
                users,
                activeUsers: {
                    x: periods,
                    y: activeUsers,
                },
                averagePosts: {
                    x: periods,
                    y: averagePosts,
                },
                cohort: await getCohort(),
            })
        } catch (error) {
            console.error(error)
            res.statusCode = 400
            res.json({ status: 400, result: error })
        } finally {
            if (conn) conn.release() //release to pool
        }
    }
)

router.get('/study/:user_id/:timestamp', async (req, res) => {
    const toCode = (char) => {
        return char.codePointAt(0).toString(16)
    }
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            'SELECT post.mainEmoji, post.storyEmojis, interaction.timeInteract FROM post, interaction, usage_period WHERE post.idInteraction = interaction.id AND interaction.idUsagePeriod = usage_period.id AND usage_period.idUser = ? AND interaction.timeInteract < FROM_UNIXTIME(?) ORDER BY interaction.timeInteract DESC LIMIT 1',
            [req.params.user_id, req.params.timestamp]
        )
        let mainCode = toCode(rows[0].mainEmoji)
        let storyCodes = Array.from(rows[0].storyEmojis).map((char) =>
            toCode(char)
        )
        const img = await joinImages(
            [
                path.join(
                    __dirname,
                    `../public/images/joypixels/${mainCode}.png`
                ),
                ...storyCodes.map((code) =>
                    path.join(
                        __dirname,
                        `../public/images/joypixels/${code}.png`
                    )
                ),
            ],
            { direction: 'horizontal' }
        )
        const id = v4()
        await img.toFile(path.join(__dirname, id + '.png'))
        await res.sendFile(path.join(__dirname, id + '.png'))
    } catch (error) {
        console.error(err)
        res.statusCode = 400
        res.json({ status: 400, result: err })
    } finally {
        if (conn) conn.release() //release to pool
    }
})

module.exports = router
