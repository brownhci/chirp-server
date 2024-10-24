const express = require('express')
const router = express.Router()
const { authenticate } = require('./middleware/authenticate')
const update_usage_period = require('./middleware/update_usage_period')
const { populateGroup } = require('./middleware/user')

/**
 * Gets users post
 * params:
 *   numPosts - int (minimum number of posts to fetch),
 *   lastPostID - int (-1 for get first post) (not inclusive)
 * returns:
 *  [
 *      [post id, poster name, poster ID, time posted, post main emoji, post story emojis, reaction type,
 *          occurrences of reaction type, requesting user's reaction (NULL if none)]
 *      (each post will have multiple rows, one for each type of emoji react on the post)
 *      ...
 * ]
 */
router.get(
    '/posts',
    authenticate,
    update_usage_period,
    populateGroup,
    async (req, res) => {
        const userID = req.session.userID
        const pool = req.app.get('pool')
        const numPosts = parseInt(req.query.num_posts)
        const lastPostID = parseInt(req.query.last_post_id)
        const { group } = req.user
        let conn
        try {
            const queryArgs = [userID]
            if (group) queryArgs.push(group)
            if (lastPostID !== -1) queryArgs.push(lastPostID)
            queryArgs.push(numPosts)
            conn = await pool.getConnection()
            // If -1 is lastPostID, we do not use lastPostID in our query string
            const rows = await conn.query(
                `SELECT post.id, user.id AS userID, user.name AS userName, interaction.timeInteract AS postTime, post.mainEmoji, post.storyEmojis,
                (SELECT react.reactEmoji
                    FROM react, interaction, usage_period, user, max_react_id
                    WHERE react.idInteraction = interaction.id AND interaction.idUsagePeriod = usage_period.id AND
                    usage_period.idUser = user.id AND react.id = max_react_id.react_id AND react.idPost = post.id AND
                    react.isRemove = 0 AND user.id = ?) AS myReaction,
                (SELECT CONCAT('{', 
                    GROUP_CONCAT(CONCAT('"', react_count.react_emoji, '"', ':', react_count.emoji_count)), 
                    '}') FROM react_count WHERE react_count.post_id = post.id) AS reactions
                FROM post, interaction, usage_period, user
                WHERE post.idInteraction = interaction.id AND interaction.idUsagePeriod = usage_period.id AND usage_period.idUser = user.id ` +
                    (group
                        ? 'AND user.group = ? '
                        : 'AND user.group IS NULL ') +
                    (lastPostID === -1 ? '' : 'AND post.id < ? ') +
                    'ORDER BY post.id DESC LIMIT ?',
                queryArgs
            )
            for (let i = 0; i < rows.length; i++) {
                rows[i].reactions = JSON.parse(rows[i].reactions)
                rows[i].avatar =
                    'https://api.dicebear.com/9.x/thumbs/png?scale=95&backgroundColor=0a5b83,1c799f,69d2e7,f1f4dc,f88c49,b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&translateY=5&seed=' + rows[i].userID + rows[i].userName
            }
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
 *   Gets posts for the given user ID
 * returns: array containing posts
 */
router.get('/posts/:id',
    authenticate,
    update_usage_period,
    populateGroup,
    async (req, res) => {
        let userID = req.params.id
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
 * Makes a post
 * body: main_emoji - string, emoji_string - string
 * returns: post_id (id of newly created post)
 */
router.post(
    '/post',
    authenticate,
    update_usage_period,
    populateGroup,
    async (req, res) => {
        const pool = req.app.get('pool')
        const usagePeriodID = req.session.usagePeriodID
        const mainEmoji = req.body.main_emoji
        const emojiString = req.body.emoji_string
        try {
            conn = await pool.getConnection()
            const rows = await conn.query(
                `INSERT INTO interaction (idUsagePeriod) VALUES (?);
                SET @cachedID = LAST_INSERT_ID();
                INSERT INTO post (idInteraction, mainEmoji, storyEmojis)
                    VALUES (@cachedID, ?, ?);
                SET @postID = LAST_INSERT_ID();
                SELECT @postID AS postID;`,
                [usagePeriodID, mainEmoji, emojiString]
            )
            const post_id = rows[4][0].postID
            res.json({ status: 200, result: { post_id: post_id } })
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
