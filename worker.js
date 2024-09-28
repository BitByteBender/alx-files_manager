import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const fileQueue = require('queue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) throw new Error('File not found');

  const sizes = [500, 250, 100];

  await Promise.all(sizes.map(async (size) => {
    try {
      const options = { width: size };
      const thumbnail = await imageThumbnail(file.localPath, options);
      const thumbnailPath = `${file.localPath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    } catch (error) {
      throw new Error(`Error generating thumbnail of size ${size}: ${error.message}`);
    }
  }));
});

fileQueue.on('completed', (job) => {
  console.log(`Job completed with id ${job.id}`);
});

fileQueue.on('failed', (job, err) => {
  console.error(`Job failed with id ${job.id} with error: ${err.message}`);
});
