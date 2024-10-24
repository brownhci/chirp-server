const express = require('express')
const router = express.Router()

router.get('/test', (req, res) => {
    res.send('hello there world')
})

router.get('/test/db', async (req, res) => {
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        await conn.query(`SELECT * FROM user LIMIT 1`)
        res.send('hello there world')
    } catch (error) {
        console.error(error)
        res.status(500).send('DB broke!')
    } finally {
        if (conn) conn.release() //release to pool
    }
})

module.exports = router
