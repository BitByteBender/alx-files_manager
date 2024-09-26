import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sendUnauthorized = (res) => res.status(401).json({ error: 'Unauthorized' });

class AuthController {
  static async getConnect(req, res) {
    const authH = req.headers.authorization;

    if (!authH || !authH.startsWith('Basic ')) return sendUnauthorized(res);

    const toBase64 = authH.split(' ')[1];
    const credentials = Buffer.from(toBase64, 'base64').toString('utf-8').split(':');
    if (credentials.length !== 2) return sendUnauthorized(res);

    const [email, password] = credentials;
    const hashedPwd = crypto.createHash('sha1').update(password).digest('hex');
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPwd });
    if (!user) return sendUnauthorized(res);

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) return sendUnauthorized(res);
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) return sendUnauthorized(res);

    await redisClient.del(key);
    return res.status(204).send();
  }
}

export default AuthController;
