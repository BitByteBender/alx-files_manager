import express from 'express';
import routes from './routes/index';

const app = express();
const HOST = process.env.HOST || 'localhost' || '0.0.0.0';
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

app.listen((PORT), (HOST), () => {
  console.log(`Server running on port ${PORT}`);
});
