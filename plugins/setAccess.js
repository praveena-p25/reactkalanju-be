const { db } = require("../utils/db");
const fp = require("fastify-plugin");
const fs = require("fs/promises");
const APM = require("../utils/apm");
/**
 * @param { import ('fastify').FastifyInstance } fastify;
 */
const plugin = async (fastify, opts) => {
  APM.apm?.startTransaction("Get All Accesses", "Accesses");
  try {
    const [files] = await db.query(
      `select JSON_OBJECTAGG(name, id) ids from accesses`
    );
    if (files[0]?.ids?.["special_super-admin"]) {
      files[0].ids.logout = "logout";
      files[0].ids.profile = "profile";
      files[0].ids.userRoleAccess = "userRoleAccess";
      await fs.writeFile(
        __dirname + "/../config/accesses.js",
        `module.exports = ${JSON.stringify(files[0].ids, null, 2).replace(
          /\(.*\)/,
          ""
        )}`
      );
    } else throw { message: "Accesses not correctly fetched" };
    APM.apm?.endTransaction("success");
    return;
  } catch (error) {
    APM.apm?.captureError(error);
    APM.apm?.endTransaction("failure");
    console.log("ERROR WHILE GETTING ACCESS =>", error);
  }
};
module.exports = fp(plugin);
