import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => console.log(err.message));
    this.getCl = promisify(this.client.get).bind(this.client);
    this.setCl = promisify(this.client.setex).bind(this.client);
    this.delCl = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const val = await this.getCl(key);
    return val;
  }

  async set(key, value, duration) {
    this.setCl(key, duration, value);
  }

  async del(key) {
    await this.delCl(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
