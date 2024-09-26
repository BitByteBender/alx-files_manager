import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sendUnauthorized = (res) => res.status(401).json({ error: 'Unauthorized' });

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const storedUsr = await dbClient.db.collection('users').findOne({ email });
    if (storedUsr) return res.status(400).json({ error: 'Already exist' });

    const hashedPwd = crypto.createHash('sha1').update(password).digest('hex');

    const newUser = { email, password: hashedPwd };
    const rslt = await dbClient.db.collection('users').insertOne(newUser);

    return res.status(201).json({
      id: rslt.insertedId.toString(),
      email,
    });
  }

  static async getMe(req, res) {
    const key = req.header('X-Token');

    if (!key || key.length === 0) return sendUnauthorized(res);

    const sess = await redisClient.get(`auth_${key}`);
    if (sess) {
      const usr = await dbClient.db.collection('users').findOne({ _id: ObjectId(sess) });
      if (usr) return res.status(200).json({ id: usr._id, email: usr.email });
    }
    return sendUnauthorized(res);
  }
}

export default UsersController;
