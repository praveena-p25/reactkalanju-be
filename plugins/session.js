const fp = require("fastify-plugin");
const keys = require("../config/keys");
const mongoose = require("mongoose");

/**
 * @param { import ('fastify').FastifyInstance } fastify
 */
const plugin = async (fastify, opts) => {
  try {
    await mongoose.connect(
      `mongodb://${keys.mongoHost}:${keys.mongoPort}/${keys.mongoDB}`,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: true,
        auth: {
          user: keys.mongoUser,
          password: keys.mongoPassword,
        },
        authSource: keys.mongoAuth,
      }
    );
    console.log("MONGO DB CONNECTED!!!!");
  } catch (error) {
    console.log("MONGO ERROR =>", error);
  }
};

module.exports = fp(plugin);
