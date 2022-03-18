const APM = require("../../utils/apm");
const { db } = require("../../utils/db");

module.exports = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      await db.query("SELECT 1;");

      reply.status(200).send({ success: true });
    } catch (error) {
      APM.apm?.captureError(error);
      reply.status(400).send({ message: error.message });
    }
  });
};
