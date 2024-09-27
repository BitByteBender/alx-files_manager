import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const sendUnauth = (res) => res.status(401).json({ error: 'Unauthorized' });
const sendCustomErr = (res, errNum, msg) => res.status(errNum).json({ error: msg });

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) return sendUnauth(res);

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return sendUnauth(res);

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return sendUnauth(res);

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;

    if (!name) return sendCustomErr(res, 400, 'Missing name');
    if (!['folder', 'file', 'image'].includes(type)) return sendCustomErr(res, 400, 'Missing type');
    if ((type === 'file' || type === 'image') && !data) return sendCustomErr(res, 400, 'Missing data');

    let fParent = null;
    if (parentId !== 0) {
      fParent = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!fParent) return sendCustomErr(res, 400, 'Parent not found');
      if (fParent.type !== 'folder') return sendCustomErr(res, 400, 'Parent is not a folder');
    }

    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
    };

    if (type === 'file' || type === 'image') {
      if (!fs.existsSync(FOLDER_PATH)) fs.mkdirSync(FOLDER_PATH, { recursive: true });

      const localPath = path.join(FOLDER_PATH, uuidv4());
      try {
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
        newFile.localPath = localPath;
      } catch (err) {
        return sendCustomErr(res, 500, 'File write failed');
      }
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

  static async getShow(req, res) {
    const token = req.header('X-Token');
    if (!token || token.length === 0) return sendUnauth(res);

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return sendUnauth(res);

    const { id } = req.params;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });

    if (!file) return sendCustomErr(res, 404, 'Not found');

    const {
      _id,
      userId: fileUserId,
      name,
      type,
      isPublic,
      parentId,
    } = file;

    return res.json({
      id: _id,
      userId: fileUserId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    if (!token || token.length === 0) return sendUnauth(res);

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return sendUnauth(res);

    const { parentId = '0', page = '0' } = req.query;
    const limit = 20;
    const skip = parseInt(page, 10) * limit;

    let files = [];
    if (parentId === '0') {
      files = await dbClient.db.collection('files')
        .find({ parentId: 0, userId: ObjectId(userId) })
        .skip(skip)
        .limit(limit)
        .toArray();
    } else {
      files = await dbClient.db.collection('files')
        .find({ parentId: ObjectId(parentId), userId: ObjectId(userId) })
        .skip(skip)
        .limit(limit)
        .toArray();
    }

    return res.status(200).json(files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
      localPath: file.localPath,
    })));
  }
}

export default FilesController;
