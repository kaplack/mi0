const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

function createStorage(env = process.env) {
  // Production keeps S3 even when no new variables have been configured.
  const provider = env.STORAGE_DRIVER || (env.NODE_ENV === 'production' ? 's3' : 'local');
  if (!['local', 's3'].includes(provider)) throw new Error('Invalid STORAGE_DRIVER');
  if (env.NODE_ENV === 'production' && provider === 'local') {
    throw new Error('Local storage is only available outside production');
  }
  const directory = path.resolve(__dirname, '..', env.LOCAL_UPLOAD_DIR || 'uploads');
  const publicDirectory = path.join(directory, 'public');

  function validateKey(key) {
    if (typeof key !== 'string' || !/^(public|private)\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(key)) {
      throw new Error('Invalid storage key');
    }
    return key;
  }

  return {
    provider,
    publicDirectory,
    // Call only after the feature has authorized the user and validated the file.
    async save({ buffer, extension, contentType, visibility = 'private' }) {
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('A nonempty Buffer is required');
      if (!['public', 'private'].includes(visibility)) throw new Error('Invalid visibility');
      if (typeof extension !== 'string' || !/^[a-zA-Z0-9]{1,10}$/.test(extension)) throw new Error('Invalid extension');
      if (typeof contentType !== 'string' || !contentType) throw new Error('Content type is required');
      const key = `${visibility}/${randomUUID()}.${extension.toLowerCase()}`;
      if (provider === 'local') {
        const target = path.join(directory, key);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buffer, { flag: 'wx' });
      } else {
        const { s3, bucket } = require('../s3');
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
      }
      return { key, size: buffer.length, contentType };
    },
    async read(key) {
      validateKey(key);
      if (provider === 'local') return fs.readFile(path.join(directory, key));
      const { s3, bucket } = require('../s3');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await result.Body.transformToByteArray());
    },
    async remove(key) {
      validateKey(key);
      if (provider === 'local') return fs.rm(path.join(directory, key), { force: true });
      const { s3, bucket } = require('../s3');
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

module.exports = { createStorage };
