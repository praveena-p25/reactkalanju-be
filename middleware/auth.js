const jwt = require("jsonwebtoken");
const allAccesses = require("../config/accesses");
const keys = require("../config/keys");
const RemovedSession = require("../model/RemovedSessions");
const Session = require("../model/Session");

/**
 * @param { import ('fastify').FastifyRequest } request
 * @param { import ('fastify').FastifyReply } reply
 */
const isAuth = async (request, reply, accesses) => {
  try {
    if (request.method !== "GET" && !request.isMultipart() && !request.body) {
      throw { status: 400, message: "Body not found in request object" };
    }

    const { authorization } = request.headers;
    const unauthenticatedError = {
      status: 401,
      message: "Login to access this resource",
    };
    const forbiddenError = {
      status: 403,
      message: "You do not have the permission to access this resource",
    };

    if (!authorization) {
      throw unauthenticatedError;
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      throw unauthenticatedError;
    }

    const decodedToken = jwt.verify(token, keys.sessionSecret);
    const session = await Session.findOne({ _id: decodedToken.sessionId });

    if (!session) {
      const delSess = await RemovedSession.find({
        sessionId: decodedToken.sessionId,
      });

      if (delSess) {
        unauthenticatedError.message = delSess.message;
      } else {
        unauthenticatedError.message = "Please login in to continue!";
      }

      await RemovedSession.deleteOne({ sessionId: decodedToken.sessionId });

      throw unauthenticatedError;
    }

    if (Date.now() >= session.exp) {
      await Session.deleteOne({ _id: session._id });

      unauthenticatedError.message = "Session Expired. Please login again!";
      throw unauthenticatedError;
    }

    if (
      accesses !== allAccesses.logout &&
      accesses !== allAccesses.profile &&
      accesses !== allAccesses.userRoleAccess
    ) {
      const roleAccess = session.roleAccess;

      const isOk = roleAccess.some((access) => accesses.includes(access));

      if (!isOk) {
        throw forbiddenError;
      }
    }

    request.user = {
      data: session,
      sessionId: session._id,
    };
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR =>", error);
    error.status = error.status ? error.status : 500;
    error.message =
      error.status !== 500 ? error.message : "Something went wrong!";

    reply.status(error.status).send({ message: error.message, success: false });
  }
};

module.exports = isAuth;
