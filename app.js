const apm = require("elastic-apm-node").start({
  serviceName: "Access-Management",
  serverUrl: require("./config/keys").apmUrl,
  environment: "development",
  captureBody: "all",
  logUncaughtExceptions: true,
  ignoreUserAgents: ["ELB"],
  logLevel: "off",
});

process.env.TZ = "Asia/Kolkata";
const APM = require("./utils/apm");
APM.apm = apm;
const fastify = require("fastify").default;
const path = require("path");
const AutoLoad = require("fastify-autoload");
const cors = require("fastify-cors");
const keys = require("./config/keys");
const {
  get_Current_User,
  user_Disconnect,
  join_User,
} = require("./socket/index");

const app = fastify({
  logger: {
    level: "info",
    file: path.join(__dirname, "fastify_logs.txt"),
  },
  bodyLimit: 5 * 1024 * 1024,
});

app.register(require("fastify-multipart"));
app.register(require("fastify-rate-limit"), {
  max: 1000,
  timeWindow: "1 minute",
  keyGenerator: function (request) {
    return (
      request.headers["user-agent"] ||
      request.ip ||
      request.url ||
      request.method ||
      request.headers["authorization"]
    );
  },
});

app.setErrorHandler((error, request, reply) => {
  if (error.statusCode == 413)
    return reply.send({
      success: false,
      message: "Upload file Limit exceeded",
    });
  if (reply.statusCode === 429) {
    error.message = "You hit the rate limit! Slow down please!";
  }
  return reply.send(error);
});

app.register(cors.default, {
  credentials: true,
  origin: ["http://localhost:3000", "https://alpha.kalanju.com"],
});

app.addHook("preHandler", async (request, reply) => {
  var objCustomLog = {
    ips: request.ips,
    query: request.query,
    params: request.params,
    body: request.body,
    appName: "API Gateway",
    category: "Microservices",
    type: "Access-Management",
    env: "development",
    servedBy: "Node (Fastify) endpoints",
  };
  apm.setCustomContext(objCustomLog);
});

app.register(AutoLoad, {
  dir: path.join(__dirname, "plugins"),
  options: Object.assign({}),
});

app.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: Object.assign({}),
});

app.get("/get-all-accesses", async (request, reply) => {
  if (request.query.secret !== keys.accessSecret)
    return reply.status(401).send({ message: "Unauthorized" });
  const accesses = require("./config/accesses");
  return accesses;
});

app.register(require("fastify-socket.io"));

app.ready((err) => {
  if (err) console.log({ err });

  console.log("Ready for Socket");

  app.io.on("connection", (socket) => {
    //for a new user joining the room in Resource Edit
    socket.on("joinResourceEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "resource_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/resource/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "resource_edit", socket);
        socket.emit("joinResourceEditRoomSuccess");
      }
    });

    socket.on("removeResourceEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //ASSETS
    socket.on("joinAssetEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "asset_edit");
      console.log(c_user);
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/asset/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "asset_edit", socket);
        socket.emit("joinAssetEditRoomSuccess");
      }
    });
    socket.on("removeAssetEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //COMPANY
    socket.on("joinCompanyEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "company_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/company/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "company_edit", socket);
        socket.emit("joinCompanyEditRoomSuccess");
      }
    });
    socket.on("removeCompanyEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //PAYMENT
    socket.on("joinPaymentEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "payment_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/payment/` });
      } else {
        const p_user = join_User(socket.id, state, id, "payment_edit", socket);
        socket.emit("joinPaymentEditRoomSuccess");
      }
    });
    socket.on("removePaymentEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //PROJECT
    socket.on("joinProjectEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "project_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/project/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "project_edit", socket);
        socket.emit("joinProjectEditRoomSuccess");
      }
    });
    socket.on("removeProjectEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //LEAD
    socket.on("joinLeadEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "lead_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/leads/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "lead_edit", socket);
        socket.emit("joinLeadEditRoomSuccess");
      }
    });
    socket.on("removeLeadEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //EXPENSE
    socket.on("joinExpenseEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "expense_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/expense/show/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "expense_edit", socket);
        socket.emit("joinExpenseEditRoomSuccess");
      }
    });
    socket.on("removeExpenseEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //INTERVIEWPANEL
    socket.on("joinInterviewpanelEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "interviewpanel_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/interview-panel/${id}` });
      } else {
        const p_user = join_User(
          socket.id,
          state,
          id,
          "interviewpanel_edit",
          socket
        );
        socket.emit("joinInterviewpanelEditRoomSuccess");
      }
    });
    socket.on("removeInterviewpanelEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //INTERVIEW
    socket.on("joinInterviewEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "interview_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/interview/show/${id}` });
      } else {
        const p_user = join_User(
          socket.id,
          state,
          id,
          "interview_edit",
          socket
        );
        socket.emit("joinInterviewEditRoomSuccess");
      }
    });
    socket.on("removeInterviewEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //INVOICE
    socket.on("joinInvoiceEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "invoice_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/invoice/${id}` });
      } else {
        const p_user = join_User(socket.id, state, id, "invoice_edit", socket);
        socket.emit("joinInvoiceEditRoomSuccess");
      }
    });
    socket.on("removeInvoiceEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //CREDIT NOTE
    socket.on("joinCreditnoteEditRoom", ({ state, id }) => {
      const c_user = get_Current_User(state, id, "creditnote_edit");
      if (c_user) {
        socket.emit("go_back", { goBackURL: `/creditnote/${id}` });
      } else {
        const p_user = join_User(
          socket.id,
          state,
          id,
          "creditnote_edit",
          socket
        );
        socket.emit("joinCreditnoteEditRoomSuccess");
      }
    });
    socket.on("removeCreditnoteEditRoom", () => {
      const p_user = user_Disconnect(socket.id);
    });

    //when the user exits the room
    socket.on("disconnect", () => {
      //the user is deleted from array of users and a left room message displayed
      const p_user = user_Disconnect(socket.id);
    });
  });
});

app.listen(4000, "0.0.0.0", async (err) => {
  if (err) {
    console.log("connection error");
    console.log(err);
  } else console.log("access management listening on port 4000");
});
