const express = require('express')
const app = express()
var path = require('path')

require('dotenv').config()

app.set('view engine', 'ejs')

const port = process.env.SERVER_PORT
const host = process.env.SERVER_HOST

var bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// replace default loggers with winston
const logger = require('./utils/logger')
console.log = (...args) => logger.info.call(logger, ...args)
console.info = (...args) => logger.info.call(logger, ...args)
console.warn = (...args) => logger.warn.call(logger, ...args)
console.error = (...args) => logger.error.call(logger, ...args)
console.debug = (...args) => logger.debug.call(logger, ...args)

// set up http logger
var morgan = require('./utils/morgan')
app.use(morgan)

// setup database
const mariadb = require('mariadb')
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_USERPW,
    multipleStatements: true,
    timezone: 'UTC',
    skipSetTimezone: true,
})
app.set('pool', pool)

const session = require('express-session')
const sess = {
    secret: process.env.SESSION_SECRET,
    cookie: {},
    resave: true,
    saveUninitialized: true,
}

app.set('views', path.join(__dirname, '/views'))
app.use(express.static(__dirname + '/public'))

app.use(session(sess))

// use router to import API requests
app.use(require('./routes/post'))
app.use(require('./routes/reaction'))
app.use(require('./routes/authentication'))
app.use(require('./routes/usage_period'))
app.use(require('./routes/user'))
app.use(require('./routes/group'))
app.use(require('./routes/test'))
app.use(require('./routes/dashboard'))

app.listen(port, host, () => console.log(`CHIME listening on ${host}:${port}!`))

module.exports = app
