const { OAuth2Client } = require("google-auth-library");
const { oAuthClientId } = require("../config/keys");

const client = new OAuth2Client({ clientId: oAuthClientId });

exports.verifyOAuthToken = (token) => {
  return client.verifyIdToken({ idToken: token, audience: oAuthClientId });
};
