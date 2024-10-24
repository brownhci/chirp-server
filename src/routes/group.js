const express = require('express')
const router = express.Router()

router.post('/group', async (req, res) => {
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        await conn.query(`INSERT INTO user_group (name) VALUES (?);`, [
            req.body.name,
        ])
        res.status(200).send()
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).send(error)
        } else {
            res.status(500).send(error)
        }
    } finally {
        if (conn) conn.release()
    }
})

module.exports = router
