const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region) {
  console.warn('AWS_REGION is not defined');
}

if (!bucket) {
  console.warn('AWS_S3_BUCKET is not defined');
}

const s3 = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

async function checkS3Connection() {
  await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    MaxKeys: 1,
  }));

  return true;
}

module.exports = {
  s3,
  bucket,
  checkS3Connection,
};
