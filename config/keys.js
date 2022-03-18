require("dotenv").config();

const keys = {
  mysqlHost: process.env.MYSQL_HOST,
  mysqlUser: process.env.MYSQL_USER,
  mysqlPassword: process.env.MYSQL_PASSWORD,
  mysqlPort: parseInt(process.env.MYSQL_PORT),
  mysqlDB: process.env.MYSQL_DB,
  sessionSecret: process.env.SESSION_SECRET,
  mongoHost: process.env.MONGO_HOST,
  mongoPort: parseInt(process.env.MONGO_PORT),
  mongoUser: process.env.MONGO_USER,
  mongoPassword: process.env.MONGO_PASSWORD,
  mongoDB: process.env.MONGO_DB,
  mongoAuth: process.env.MONGO_AUTH_SOURCE,
  oAuthClientId: process.env.OAUTH_CLIENT_ID,
  apmUrl: process.env.APM_URL,
  spacesAccessKeyId: process.env.SPACES_ACCESS_KEY,
  spacesSecretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  spacesBucketName: process.env.SPACES_BUCKET_NAME,
  spacesBucketUrl: process.env.SPACES_BUCKET_URL,
  accessSecret: process.env.ACCESS_SECRET,
};

module.exports = keys;
