const { model, Schema } = require('mongoose');

const sessionSchema = new Schema({
    exp: Number,
    iat: Number,
    userId: Number,
    email: String,
    roleAccess: Array,
    name: String,
    roleId: Number,
    picture: String,
    role: String,
})

const Session = model('Sesssion', sessionSchema);

module.exports = Session;