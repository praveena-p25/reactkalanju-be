const queries = require("../../utils/myProfileQueries");
const isAuth = require("../../middleware/auth");
const messages = require("../../utils/messages");
const allAccesses = require("../../config/accesses");
const { s3, upload } = require("../../utils/AccessSpaces");
const APM = require("../../utils/apm");
const { spacesBucketName } = require("../../config/keys");

/**
 * @param { import ('fastify').FastifyInstance } fastify
 */
module.exports = async (fastify, opts) => {
  fastify.get(
    "/",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (request, reply) => {
      try {
        const resourceDetails = await queries.getResourceDetails(
          request.user.data.userId
        );

        reply.status(200).send({
          data: resourceDetails[0],
          message: messages.read,
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error);
        reply.status(500).send({
          message: error.errorSts ? error.message : messages.error,
          success: false,
        });
      }
    }
  ),
    fastify.get(
      "/skills",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, reply) => {
        try {
          const resourceSkills = await queries.getResourceSkills(
            request.user.data.userId
          );

          reply.status(200).send({
            data: resourceSkills,
            message: messages.read,
            roleAccess: request.user.data.roleAccess,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error);
          reply.status(500).send({
            message: error.errorSts ? error.message : messages.error,
            success: false,
          });
        }
      }
    ),
    fastify.get(
      "/certifications",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, reply) => {
        try {
          const resourceCertifications =
            await queries.getResourceCertifications(request.user.data.userId);

          reply.status(200).send({
            data: resourceCertifications,
            message: messages.read,
            roleAccess: request.user.data.roleAccess,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error);
          reply.status(500).send({
            message: error.errorSts ? error.message : messages.error,
            success: false,
          });
        }
      }
    ),
    fastify.get(
      "/experience",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, reply) => {
        try {
          const resourceExperience = await queries.getResourceExperience({
            id: request.user.data.userId,
          });

          reply.status(200).send({
            data: resourceExperience,
            message: messages.read,
            roleAccess: request.user.data.roleAccess,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error);
          reply.status(500).send({
            message: error.errorSts ? error.message : messages.error,
            success: false,
          });
        }
      }
    ),
    //Save Experience
    fastify.post(
      "/experience",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          let up = await upload.fields([
            { name: "salarySlip" },
            { name: "revelingLetter" },
          ]);
          await new Promise((resolve, reject) => {
            up(req, res, async (err) => {
              try {
                if (err) throw { message: err.message };
                let body = { ...req.body, resource_id: req.user.data.userId };
                const rows = await queries.saveExperience(
                  body,
                  req.user.data.userId
                );
                if (req.files.salarySlip) {
                  await queries.saveDocument({
                    name: "salarySlip",
                    documentable_id: rows.insertId,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.salarySlip[0].key,
                  });
                }
                if (req.files.revelingLetter) {
                  await queries.saveDocument({
                    name: "RevelingLetter",
                    documentable_id: rows.insertId,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.revelingLetter[0].key,
                  });
                }
                res.status(200).send({
                  message: "Successfully Added Experience",
                  success: true,
                });
                resolve(true);
              } catch (err) {
                reject(err);
              }
            });
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    );

  //Edit Experience
  fastify.put(
    "/experience/:id",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        let up = await upload.fields([
          { name: "salarySlip" },
          { name: "revelingLetter" },
        ]);
        await new Promise((resolve, reject) => {
          up(req, res, async (err) => {
            try {
              if (err) throw { message: err.message };
              if (req.files.salarySlip) {
                if (
                  req.body.salarySlipId != "null" &&
                  req.body.salarySlipStatus == "Changed"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.salarySlipName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {
                      name: "salarySlip",
                      documentable_id: req.params.id,
                      documentable_type: "Experience",
                      number: null,
                      url: req.files.salarySlip[0].key,
                    },
                    req.method,
                    req.body.salarySlipId
                  );
                } else {
                  await queries.saveDocument({
                    name: "salarySlip",
                    documentable_id: req.params.id,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.salarySlip[0].key,
                  });
                }
              } else {
                if (
                  req.body.salarySlipId &&
                  req.body.salarySlipStatus == "Deleted"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.salarySlipName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {},
                    "DELETE",
                    req.body.salarySlipId
                  );
                }
              }

              if (req.files.revelingLetter) {
                if (
                  req.body.revelingLetterId != "null" &&
                  req.body.revelingLetterStatus == "Changed"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.revelingLetterName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {
                      name: "revelingLetter",
                      documentable_id: req.params.id,
                      documentable_type: "Experience",
                      number: null,
                      url: req.files.revelingLetter[0].key,
                    },
                    req.method,
                    req.body.revelingLetterId
                  );
                } else {
                  await queries.saveDocument({
                    name: "revelingLetter",
                    documentable_id: req.params.id,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.revelingLetter[0].key,
                  });
                }
              } else {
                if (
                  req.body.revelingLetterId &&
                  req.body.revelingLetterStatus == "Deleted"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.relevingLetterName,
                  };
                  s3.deleteObject(params, (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {},
                    "DELETE",
                    req.body.revelingLetterId
                  );
                }
              }
              const body = { ...req.body, resource_id: req.user.data.userId };
              const a = await queries.updateExperience(
                body,
                req.method,
                req.params.id
              );
              const result = await queries.getResourceExperience({
                id: req.user.data.userId,
              });
              res.status(200).send({
                data: result,
                message: `Successfully ${
                  req.method === "DELETE" ? "Deleted" : "Updated"
                } Experience`,
                success: true,
              });
              resolve(true);
            } catch (err) {
              reject(err);
            }
          });
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  //Delete Experience
  fastify.delete(
    "/experience/:id",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        let up = await upload.fields([
          { name: "salarySlip" },
          { name: "revelingLetter" },
        ]);
        await new Promise((resolve, reject) => {
          up(req, res, async (err) => {
            try {
              if (err) throw { message: err.message };
              if (req.files.salarySlip) {
                if (
                  req.body.salarySlipId != "null" &&
                  req.body.salarySlipStatus == "Changed"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.salarySlipName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {
                      name: "salarySlip",
                      documentable_id: req.params.id,
                      documentable_type: "Experience",
                      number: null,
                      url: req.files.salarySlip[0].key,
                    },
                    req.method,
                    req.body.salarySlipId
                  );
                } else {
                  await queries.saveDocument({
                    name: "salarySlip",
                    documentable_id: req.params.id,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.salarySlip[0].key,
                  });
                }
              } else {
                if (
                  req.body.salarySlipId &&
                  req.body.salarySlipStatus == "Deleted"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.salarySlipName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {},
                    "DELETE",
                    req.body.salarySlipId
                  );
                }
              }

              if (req.files.revelingLetter) {
                if (
                  req.body.revelingLetterId != "null" &&
                  req.body.revelingLetterStatus == "Changed"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.revelingLetterName,
                  };
                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {
                      name: "revelingLetter",
                      documentable_id: req.params.id,
                      documentable_type: "Experience",
                      number: null,
                      url: req.files.revelingLetter[0].key,
                    },
                    req.method,
                    req.body.revelingLetterId
                  );
                } else {
                  await queries.saveDocument({
                    name: "revelingLetter",
                    documentable_id: req.params.id,
                    documentable_type: "Experience",
                    number: null,
                    url: req.files.revelingLetter[0].key,
                  });
                }
              } else {
                if (
                  req.body.revelingLetterId &&
                  req.body.revelingLetterStatus == "Deleted"
                ) {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.relevingLetterName,
                  };
                  s3.deleteObject(params, (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  await queries.updateDocument(
                    {},
                    "DELETE",
                    req.body.revelingLetterId
                  );
                }
              }
              const a = await queries.updateExperience(
                req.body,
                req.method,
                req.params.id
              );
              const result = await queries.getResourceExperience({
                id: req.user.data.userId,
              });
              res.status(200).send({
                data: result,
                message: `Successfully ${
                  req.method === "DELETE" ? "Deleted" : "Updated"
                } Experience`,
                success: true,
              });
              resolve(true);
            } catch (err) {
              reject(err);
            }
          });
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  fastify.get(
    "/bank_accounts",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (request, reply) => {
      try {
        const resourceBankAccounts = await queries.getResourceBankAccounts(
          request.user.data.userId
        );

        reply.status(200).send({
          data: resourceBankAccounts,
          message: messages.read,
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error);
        reply.status(500).send({
          message: error.errorSts ? error.message : messages.error,
          success: false,
        });
      }
    }
  ),
    fastify.get(
      "/family",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, reply) => {
        try {
          const resourceFamliy = await queries.getResourcefamily(
            request.user.data.userId
          );
          reply.status(200).send({
            data: resourceFamliy,
            message: messages.read,
            roleAccess: request.user.data.roleAccess,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error);
          reply.status(500).send({
            message: error.errorSts ? error.message : messages.error,
            success: false,
          });
        }
      }
    ),
    //Get DOB using resources id
    fastify.get(
      "/dob/:id",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          const rows = await queries.getDobwithResourceId(req.user.data.userId);
          res.status(200).send({
            data: rows,
            roleAccess: req.user.data.roleAccess,
            message: "Successfully fetched data",
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("RESOURCES ID ERROR =>", error);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    );

  fastify.get(
    "/documents",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (request, reply) => {
      try {
        const resourceDocuments = await queries.getResourceDocuments(
          request.user.data.userId
        );

        reply.status(200).send({
          data: resourceDocuments,
          message: messages.read,
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error);
        reply.status(500).send({
          message: error.errorSts ? error.message : messages.error,
          success: false,
        });
      }
    }
  ),
    fastify.get(
      "/projects",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, reply) => {
        try {
          const resourceProjects = await queries.getResourceProjects(
            request.user.data.userId
          );

          reply.status(200).send({
            data: resourceProjects,
            message: messages.read,
            roleAccess: request.user.data.roleAccess,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error);
          reply.status(500).send({
            message: error.errorSts ? error.message : messages.error,
            success: false,
          });
        }
      }
    ),
    //Save Document
    fastify.post(
      "/document/save",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          let up = await upload.fields([{ name: "file" }]);
          await new Promise((resolve, reject) => {
            up(req, res, async (err) => {
              try {
                if (err) throw { message: err.message };
                if (req.files.file) {
                  const rows = await queries.saveDocument({
                    ...req.body,
                    documentable_id: req.user.data.userId,
                    url: req.files.file[0].key,
                  });
                  res.status(200).send({
                    data: rows,
                    message: "Successfully Added Document",
                    success: true,
                  });
                }
                resolve(true);
              } catch (err) {
                reject(err);
              }
            });
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    );

  //Edit Document Person Details
  fastify.put(
    "/document/:id/:cID",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        let rows = [];
        if (req.params.cID == 1) {
          let up = upload.fields([{ name: "file" }]);
          await new Promise((resolve, reject) => {
            up(req, res, async (err) => {
              try {
                if (err) throw { message: err.message };
                else {
                  var params = {
                    Bucket: spacesBucketName,
                    Key: req.body.url,
                  };

                  s3.deleteObject(params, async (err, data) => {
                    if (err) {
                      APM.apm?.captureError(err);
                      console.log(err);
                    }
                  });
                  const rows = await queries.updateDocument(
                    { ...req.body, url: req.files.file[0].key },
                    req.method,
                    req.params.id
                  );
                  res.status(200).send({
                    data: rows,
                    message: "Successfully Added Document",
                    success: true,
                  });
                }
                resolve(true);
              } catch (err) {
                reject(err);
              }
            });
          });
        } else if (req.params.cID == 0) {
          rows = await queries.updateDocument(
            req.body,
            req.method,
            req.params.id
          );
          res.status(200).send({
            data: rows,
            message: `Successfully ${
              req.method === "DELETE" ? "Deleted" : "Updated"
            } Document`,
            success: true,
          });
        } else {
          throw { status: 404, message: "Not Found" };
        }
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  //Delete Document Person Details
  fastify.delete(
    "/document/:id/:cId",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      if (req.method === "DELETE") {
        const rows = await queries.updateDocument(
          {},
          req.method,
          req.params.id
        );
        res.status(200).send({
          data: rows,
          message: "Successfully Deleted Document",
          success: true,
        });
      }
    }
  );

  fastify.get(
    "/assets",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (request, reply) => {
      try {
        const resourceAssets = await queries.getResourceAssets(
          request.user.data.userId
        );

        reply.status(200).send({
          data: resourceAssets,
          message: messages.read,
          roleAccess: request.user.data.roleAccess,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error);
        reply.status(500).send({
          message: error.errorSts ? error.message : messages.error,
          success: false,
        });
      }
    }
  );

  fastify.put(
    "/edit",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        const rows = await queries.updateResources(
          req.body,
          req.user.data.userId
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: `Successfully ${
            req.method === "DELETE" ? "Deleted" : "Updated"
          } Resources`,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  ),
    fastify.post(
      "/skill",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          const rows = await queries.saveSkill(req.body, req.user.data.userId);
          res.status(200).send({
            data: rows,
            roleAccess: req.user.data.roleAccess,
            message: "Successfully added skill",
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    );

  fastify.put(
    "/skill",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        console.log(req.body);
        const rows = await queries.updateSkill(
          req.body,
          req.method,
          req.params.id
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: `Successfully ${
            req.method === "DELETE" ? "Deleted" : "Updated"
          } Certification`,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  ),
    fastify.put(
      "/skill/primary",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (request, response) => {
        try {
          const { skill } = request.body;
          if (skill.length > 2) {
            throw {
              message: "More than two primary skills selected",
              errorSts: true,
            };
          }
          await queries.updatePrimarySkills(skill, request.user.data.userId);
          response.status(200).send({
            message: "Successfully updated primary skill",
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          response.status(500).send({
            message: error.errorSts ? error.message : "Something went wrong",
            success: false,
          });
        }
      }
    );

  fastify.get(
    "/allSkills",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        const rows = await queries.getAllSkills();
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: "Successfully fetched skills",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  ),
    fastify.get(
      "/managers",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          const rows = await queries.getAllResourceName();
          res.status(200).send({
            data: rows,
            roleAccess: req.user.data.roleAccess,
            message: "Successfully fetched data",
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    ),
    //Edit Family Person Details - Child Only
    fastify.put(
      "/family/:id",
      {
        preHandler: (request, reply) =>
          isAuth(request, reply, allAccesses.profile),
      },
      async (req, res) => {
        try {
          const rows = await queries.updateFamilies(
            req.body,
            req.method,
            req.params.id
          );
          res.status(200).send({
            data: rows,
            roleAccess: req.user.data.roleAccess,
            message: `Successfully ${
              req.method === "DELETE" ? "Deleted" : "Updated"
            } Family`,
            success: true,
          });
        } catch (error) {
          APM.apm?.captureError(error);
          console.log("ERROR =>", error.message);
          res
            .status(error.status ? error.status : 500)
            .send({ message: error.message, success: false });
        }
      }
    );

  //Delete Family Person Details
  fastify.delete(
    "/family/:id",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        const rows = await queries.updateFamilies(
          req.body,
          req.method,
          req.params.id
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: `Successfully ${
            req.method === "DELETE" ? "Deleted" : "Updated"
          } Family`,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  fastify.post(
    "/savefamily",
    {
      preHandler: (request, reply) =>
        isAuth(request, reply, allAccesses.profile),
    },
    async (req, res) => {
      try {
        await Promise.all(
          req.body.map(async (reso) => {
            if (reso.id) {
              try {
                let a = await queries.updateFamilies(reso, req.method, reso.id);
                return a;
              } catch (error) {
                APM.apm?.captureError(error);
                throw { message: error.message };
              }
            } else {
              try {
                let b = await queries.saveFamilies(reso, req.user.data.userId);
                return b;
              } catch (error) {
                APM.apm?.captureError(error);
                throw { message: error.message };
              }
            }
          })
        );
        res
          .status(200)
          .send({ message: "Successfully Saved data", success: true });
      } catch (error) {
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  //Edit Certification
  fastify.put(
    "/certifications/update",
    {
      preHandler: (request, reply) => isAuth(request, reply, [1, 3, 5, 50, 79]),
    },
    async (req, res) => {
      try {
        console.log("PUT", req.body);
        const rows = await queries.updateCertification(
          req.body,
          req.method,
          req.user.data.userId
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: `Successfully ${
            req.method === "DELETE" ? "Deleted" : "Updated"
          } Certification`,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  //Save Certification
  fastify.post(
    "/certifications/add",
    {
      preHandler: (request, reply) => isAuth(request, reply, [1, 3, 5, 50, 79]),
    },
    async (req, res) => {
      try {
        const rows = await queries.saveCertification(
          req.body,
          req.user.data.userId
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: "Successfully Added Certification",
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );

  //Delete Certification
  fastify.delete(
    "/certifications/update",
    {
      preHandler: (request, reply) => isAuth(request, reply, [1, 3, 5, 50, 79]),
    },
    async (req, res) => {
      try {
        console.log("DELETE", req.body);
        const rows = await queries.updateCertification(
          req.body,
          req.method,
          req.user.data.userId
        );
        res.status(200).send({
          data: rows,
          roleAccess: req.user.data.roleAccess,
          message: `Successfully ${
            req.method === "DELETE" ? "Deleted" : "Updated"
          } Certification`,
          success: true,
        });
      } catch (error) {
        APM.apm?.captureError(error);
        console.log("ERROR =>", error.message);
        res
          .status(error.status ? error.status : 500)
          .send({ message: error.message, success: false });
      }
    }
  );
};
