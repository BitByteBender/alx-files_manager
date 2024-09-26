import crypto from 'crypto';
import dbClient from '../utils/db';

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
}

export default UsersController;
