import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const sendUnauth = (res) => res.status(401).json({ error: 'Unauthorized' });
const sendCustomErr = (res, msg) => res.status(400).json({ error: msg });

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return sendUnauth(res);

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return sendUnauth(res);

    const user = await dbClient.db.collection('users').findOne({ _id: dbClient.constructor.getObjectId(userId) });
    if (!user) return sendUnauth(res);

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;

    if (!name) return sendCustomErr(res, 'Missing name');
    if (!['folder', 'file', 'image'].includes(type)) return sendCustomErr(res, 'Missing type');
    if ((type === 'file' || type === 'image') && !data) return sendCustomErr(res, 'Missing data');

    let fParent = null;
    if (parentId !== 0) {
      fParent = await dbClient.db.collection('files').findOne({ _id: dbClient.constructor.getObjectId(parentId) });
      if (!fParent) return sendCustomErr(res, 'Parent not found');
      if (fParent.type !== 'folder') return sendCustomErr(res, 'Parent is not a folder');
    }

    const newFile = {
      userId: dbClient.constructor.getObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'file' || type === 'image') {
      if (!fs.existsSync(FOLDER_PATH)) fs.mkdirSync(FOLDER_PATH, { recursive: true });

      const localPath = path.join(FOLDER_PATH, uuidv4());
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
      newFile.localPath = localPath;
    }

    const rslt = await dbClient.db.collection('files').insertOne(newFile);

    return res.status(201).json({
      id: rslt.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }
}

export default FilesController;
