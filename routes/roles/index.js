const queries = require("../../utils/queries");
const isAuth = require("../../middleware/auth");
const Session = require("../../model/Session");
const allAccesses = require("../../config/accesses");
const RemovedSession = require("../../model/RemovedSessions");
const APM = require("../../utils/apm");

/**
 * @param { import ('fastify').FastifyInstance } fastify
 */
module.exports = async (fastify, opts) => {
  // returns rows in the reply with status of 200
  // each row contains id, role, total_count, active,inactive fields
  fastify.get(
    "/",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const rows = await queries.getRolesAndCount();

        reply.status(200).send({
          data: rows,
          roleAccess: request.user.data.roleAccess,
          message: "Successfully fetched data",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  

  fastify.get(
    "/accesses/structure",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const rows = await queries.getAccesses();

        reply.status(200).send({
          data: rows,
          roleAccess: request.user.data.roleAccess,
          message: "Successfully fetched data",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  // returns a list of access id which is enabled
  fastify.get(
    "/accesses/:roleId",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const { roleId } = request.params;
        const rows = await queries.getAccesForRole(roleId);

        reply.status(200).send({
          data: rows,
          roleAccess: request.user.data.roleAccess,
          message: "Successfully fetched accesses",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  // edit the accesses of a role
  fastify.put(
    "/:roleId/edit",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const { roleId } = request.params;
        const { roleName, selectedAccesses } = request.body;

        await queries.editRoleAccess(roleId, roleName, selectedAccesses);

        const sessions = await Session.updateMany(
          { roleId: roleId },
          { $set: { roleAccess: selectedAccesses, role: roleName } }
        );

        reply.send({
          message: "Successfully updated role",
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  // creates a new role with its accesses
  fastify.post(
    "/new",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const { roleName, selectedAccesses } = request.body;

        if (!roleName || selectedAccesses === undefined) {
          reply
            .status(422)
            .send({ message: "Invalid data changes", success: false });
        }

        const rows = await queries.createRoleWithAcesses(
          roleName,
          selectedAccesses
        );

        reply.status(200).send({
          message: "role created successfully",
          roleAccess: request.user.data.roleAccess,
          data: rows,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  fastify.get(
    "/resource_access/list",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const rows = await queries.getResources();

        reply.status(200).send({
          data: rows,
          message: "successfully fetched resource for roles",
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  /**
   * @body EmployeeId,RoleId
   * @return success message for update
   */
  // Update resources role and level
  fastify.put(
    "/resources/rolelevel",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
      websocket: true,
    },
    async (request, reply) => {
      try {
        // Extracting Employee id, role id and level
        const { employee_id, role_id } = request.body;

        // Updating in database
        const rows = await queries.updateResourcesRoleAndLevel(
          employee_id,
          role_id
        );

        // Check if rows got affected or not
        if (rows.affectedRows == 0) {
          reply
            .status(error.status ? error.status : 500)
            .send({ message: "Designation not updated", success: false });
        }

        const delUser = await Session.find({ userId: employee_id });
        // console.log('BEFORE DEL', delUser)

        await Session.deleteMany({ userId: employee_id });

        if (delUser) {
          await RemovedSession.insertMany(
            delUser.map((user) => ({
              sessionId: user._id,
              message:
                "Your role has been changed. Please login again for the change to take effect!",
            }))
          );
        }

        // const afterDel = await Session.find({})
        // console.log('AFTER DEL', afterDel)

        reply.status(200).send({
          message: "Designation updated successfully",
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("Error => ", error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  // returns a list of all the resources with the role_id
  // use page to change the offset and page_size for the number of rows to be returned
  fastify.post(
    "/resource_access/list",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const { roleId, searchQuery, page, pageSize, active } = request.body;

        const offset = (page - 1) * pageSize;

        const { result, resourcesCount } = await queries.getResourcesForRoles(
          roleId,
          searchQuery,
          offset,
          pageSize,
          active
        );

        reply.status(200).send({
          data: { resources: result, resourcesCount },
          roleAccess: request.user.data.roleAccess,
          message: "successfully fetched resource for roles",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  // provide the id of the role to be deleted
  // deletes the role and the access for that role
  fastify.delete(
    "/:roleId",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, [allAccesses.role_admin]),
    },
    async (request, reply) => {
      try {
        const { roleId } = request.params;

        if (!roleId) {
          reply
            .status(422)
            .send({ message: "id not recieved", success: false });
        }

        const rows = await queries.deleteRoleWithId(roleId);

        reply.status(200).send({
          data: rows,
          roleAccess: request.user.data.roleAccess,
          message: "Successfully deleted role",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        reply
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );
};
