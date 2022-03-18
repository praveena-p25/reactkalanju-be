const fp = require("fastify-plugin");
const DbMigrate = require("db-migrate");

const runMigrations = () => {
  return new Promise((resolve, reject) => {
    const dbMigrate = DbMigrate.getInstance(true);
    dbMigrate.silence(true);

    dbMigrate.up((error, results = []) => {
      if (error) {
        return reject(error);
      }

      resolve(results);
    });
  });
};

/**
 * @param { import ('fastify').FastifyInstance } fastify
 */
const plugin = async (fastify, opts) => {
  runMigrations()
    .then((migrationsRan) => {
      if (migrationsRan.length) {
        console.log("Successfully ran migrations");
      } else {
        console.log("No migrations to run");
      }
    })
    .catch((error) => {
      console.log("MIGRATION ERROR =>", error);
    });
};
module.exports = fp(plugin);
