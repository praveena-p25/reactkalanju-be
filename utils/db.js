const mysql = require('mysql2')
const keys = require('../config/keys')

exports.db = mysql.createPool({
  host: keys.mysqlHost,
  user: keys.mysqlUser,
  password: keys.mysqlPassword,
  database: keys.mysqlDB,
  port: keys.mysqlPort,
  multipleStatements:true
})
  .promise()
