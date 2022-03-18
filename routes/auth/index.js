const { db } = require("../../utils/db");
const { verifyOAuthToken } = require("../../utils/oauthClient");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const isAuth = require("../../middleware/auth");
const Session = require("../../model/Session");
const allAccesses = require("../../config/accesses");
const APM = require("../../utils/apm");

/**
 * @param { import ('fastify').FastifyInstance } fastify
 */
module.exports = async (fastify, opts) => {
  fastify.post("/login", async (request, reply) => {
    try {
      if (!request.body) {
        throw new Error("Body not found in Request object");
      }

      // const before = await Session.find({})
      // console.log('BEFORE DELETE', before)

      // await Session.deleteMany({})

      // const after = await Session.find({})
      // console.log('AFTER DELETE', after)

      const { tokenId } = request.body;
      const res = await verifyOAuthToken(tokenId);
      const { email, hd, picture, name } = res.getPayload();

      if (hd !== "codingmart.com") {
        throw new Error("This email is not valid to login to kalanju");
      }

      // let testemail = email

      // if (hd !== 'codingmart.com') {
      //     testemail = 'senthil@codingmart.com'
      // }

      // const testemail = 'senthil@codingmart.com'

      const [users] = await db.query(
        `SELECT res.id, res.name, res.email, ro.role, ro.id AS role_id FROM resources AS res
                INNER JOIN roles AS ro
                ON res.role_id = ro.id
                WHERE ro.deleted_at IS NULL AND res.deleted_at IS NULL AND res.active = 1 AND res.email = ?`,
        [email]
      );

      if (!users.length) {
        throw new Error("This user does not exist");
      }

      await db.query(`UPDATE resources SET profile_photo = ? WHERE email = ?`, [
        picture,
        email,
      ]);

      const [access] = await db.query(
        `SELECT ro.access_id FROM resources AS re 
                INNER JOIN role_accesses AS ro
                ON re.role_id = ro.role_id 
                WHERE ro.deleted_at IS null AND re.active = 1 AND re.email = ?`,
        [email]
      );

      const roleAccess = access
        .map((role) => role.access_id)
        .sort((a, b) => a - b);

      const user = {
        id: users[0].id,
        email,
        roleAccess,
        name: users[0].name,
        role: users[0].role,
        picture,
      };

      const iat = Date.now();
      const exp = Date.now() + 1000 * 60 * 60 * 12;

      const session = new Session({
        userId: users[0].id,
        email: email,
        roleAccess,
        name: users[0].name,
        roleId: users[0].role_id,
        role: users[0].role,
        picture,
        iat,
        exp,
      });

      const savedSession = await session.save();

      // const afterSave = await Session.find({})
      // console.log('AFTER SAVE', afterSave)

      const token = jwt.sign(
        { sessionId: savedSession._id, iat, exp },
        keys.sessionSecret
      );

      reply
        .status(200)
        .send({
          user,
          token,
          success: true,
          message: "Successfully logged in!",
        });
    } catch (error) {
      APM.apm?.captureError(error);
      console.log("LOGIN ERROR", error);
      console.log("ERROR MESSAGE", error.message);
      reply.status(500).send({ message: error.message, success: false });
    }
  });

  fastify.post(
    "/logout",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.logout),
    },
    async (request, reply) => {
      try {
        await Session.deleteOne({ _id: request.user.sessionId });

        reply.send({ message: "Logout successful", success: true });
      } catch (error) {
        APM.apm?.captureError(error);
        console.error(error.message);
        reply.status(500).send({ message: error.message, success: false });
      }
    }
  );

  fastify.post("/force_logout", async (request, reply) => {
    try {
      const token = request.headers.authorization.split(" ")[1];
      const decodedToken = jwt.decode(token);

      await Session.deleteOne({ _id: decodedToken.sessionId });

      reply.send({
        message: "Logged out!! Session Exipred! Login again to continue",
        success: true,
      });
    } catch (error) {
      APM.apm?.captureError(error);
      console.error(error.message);
      reply.status(500).send({ message: error.message, success: false });
    }
  });

  fastify.get(
    "/user_role_access",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.userRoleAccess),
    },
    async (request, reply) => {
      try {
        const user = {
          id: request.user.data.userId,
          email: request.user.data.email,
          roleAccess: request.user.data.roleAccess,
          name: request.user.data.name,
          role: request.user.data.role,
          picture: request.user.data.picture,
        };

        reply
          .status(200)
          .send({
            user,
            message: "Successfully fetched accesses",
            success: true,
          });
      } catch (err) {
        APM.apm?.captureError(err);
        console.log(err);
        reply
          .status(500)
          .send({ message: "Something went wrong!", success: false });
      }
    }
  );
};
