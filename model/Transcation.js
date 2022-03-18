const { model, Schema } = require("mongoose");

const transcationSchema = new Schema({
  exp: Number,
  path: String,
  userId: String,
});

const Transcation = model("Sesssion", transcationSchema);
