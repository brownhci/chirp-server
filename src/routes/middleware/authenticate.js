/*
 * Authenticates a user
 */
exports.authenticate = (req, res, next) => {
    const userID = req.session.userID
    if (userID === undefined) {
        res.statusCode = 401
        res.json({ status: 401, result: 'User is not logged in' })
        res.send()
        return
    }
    next()
}

exports.authenticateAdmin = (req, res, next) => {
    const admin = req.session.admin
    if (!admin) {
        res.statusCode = 401
        res.json({ status: 401, result: 'User is not an admin' })
        res.send()
        return
    }
    next()
}
