// Middleware to add groupId to req
exports.populateGroup = async (req, res, next) => {
    const pool = req.app.get('pool')
    let conn
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(
            `SELECT user.group FROM user WHERE id = ?`,
            [req.session.userID]
        )
        if (req.user) req.user.group = rows[0]?.group
        else req.user = { group: rows[0]?.group }
        next()
    } catch (error) {
        console.error(error)
        res.statusCode = 500
        res.json({ status: 500, result: error })
        next()
    } finally {
        if (conn) conn.release() //release to pool
    }
}
