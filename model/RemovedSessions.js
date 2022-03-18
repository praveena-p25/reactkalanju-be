const { model, Schema } = require("mongoose");

const sessionSchema = new Schema({
  sessionId: String,
  message: String,
});

const RemovedSession = model("RemovedSesssion", sessionSchema);

module.exports = RemovedSession;
