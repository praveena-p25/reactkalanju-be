const aws = require("aws-sdk");
const multer = require("fastify-multer");
const multerS3 = require("multer-s3");
const path = require("path");
const {
  spacesAccessKeyId,
  spacesSecretAccessKey,
  spacesBucketName,
  spacesBucketUrl,
} = require("../config/keys");

// Set S3 endpoint to DigitalOcean Spaces
const spacesEndpoint = new aws.Endpoint(spacesBucketUrl);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: spacesAccessKeyId,
  secretAccessKey: spacesSecretAccessKey,
});

var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: spacesBucketName,
    acl: "public-read",
    key: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  }),
});

function deleteObject(key) {
  s3.deleteObject(
    {
      Bucket: spacesBucketName,
      Key: key,
    },
    console.log
  );
}

module.exports = { upload, s3, deleteObject };
