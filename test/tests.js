require('dotenv').config()
var fs = require('fs')

// Switch to testing env, use superuser
process.env.DB_USER = process.env.DB_SUPERUSER
process.env.DB_USERPW = process.env.DB_SUPERUSERPW
process.env.DB_NAME = 'chirptest'

// Create superuser pool
const mariadb = require('mariadb')
const pool = mariadb.createPool({
    user: process.env.DB_SUPERUSER,
    password: process.env.DB_SUPERUSERPW,
    multipleStatements: true,
})

// createDatabase creates a testing database
function createDatabase(x) {
    return new Promise((resolve) => {
        fs.readFile('chirp.sql', 'utf8', function (err, data) {
            pool.getConnection().then((conn) => {
                conn.query(
                    `DROP DATABASE IF EXISTS chirptest;
            CREATE DATABASE chirptest; USE chirptest;` + data
                )
                    .then((rows) => {
                        console.log('Finished creating database')
                        resolve(x)
                    })
                    .catch((error) => {
                        console.log(error)
                    })
            })
        })
    })
}

// Disable error logging (re-enable if errors are encountered)
// console.error = function () {
// }

// Before testing starts, create database
before(async function () {
    await createDatabase()
})

// Require testing modules in desired order
describe('account_test', function () {
    require('./tests/account_test.js')
})

describe('session_test', function () {
    require('./tests/usage_period_test.js')
})

describe('interact_post_test', function () {
    require('./tests/interaction_post_test.js')
})

describe('interact_get_test', function () {
    require('./tests/interaction_get_test.js')
})

describe('group_test', function () {
    require('./tests/group_test.js')
})
