/*
 * Creates a usage_period if one does not exist in the database
 */
module.exports = async (req, res, next) => {
    const pool = req.app.get('pool')
    const userID = req.session.userID
    const sessionID = req.sessionID
    const usagePeriodID = req.session.usagePeriodID
    const isExpired =
        (req.session.expiration || Number.POSITIVE_INFINITY) <
        new Date().getTime()
    let conn
    try {
        conn = await pool.getConnection()
        if (req.session.usagePeriodID === undefined || isExpired) {
            // If our session expired or we had no session, create a new one
            const newExpiration =
                new Date().getTime() +
                parseInt(process.env.USAGE_PERIOD_EXPIRATION) // note session_expiration is in millisecs
            const datetime = new Date(newExpiration)
                .toISOString()
                .slice(0, 19)
                .replace('T', ' ')
            const rows = await conn.query(
                `INSERT INTO usage_period (uidSession, idUser, timeEnd) VALUES (?,?,?);
                SET @cachedID = LAST_INSERT_ID();
                SELECT @cachedID AS usagePeriodID`,
                [sessionID, userID, datetime]
            )
            req.session.usagePeriodID = rows[2][0].usagePeriodID
            req.session.expiration = newExpiration
            next()
        } else {
            // If session exists and is not expired, update the expiration date in the server and the db
            const newExpiration =
                new Date().getTime() +
                parseInt(process.env.USAGE_PERIOD_EXPIRATION)
            const datetime = new Date(newExpiration)
                .toISOString()
                .slice(0, 19)
                .replace('T', ' ')
            await conn.query(
                `UPDATE usage_period SET timeEnd = ? WHERE id = ?`,
                [datetime, usagePeriodID]
            )
            req.session.expiration = newExpiration
            next()
        }
    } finally {
        if (conn) conn.release() //release to pool
    }
}
