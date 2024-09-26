import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT) || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}`;

    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = null;
    this.connect();
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.database);
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    if (this.db) {
      const countUsers = this.db.collection('users').countDocuments();
      return countUsers;
    }
    return 0;
  }

  async nbFiles() {
    if (this.db) {
      const countFiles = await this.db.collection('files').countDocuments();
      return countFiles;
    }
    return 0;
  }
}

const dbClient = new DBClient();
export default dbClient;
