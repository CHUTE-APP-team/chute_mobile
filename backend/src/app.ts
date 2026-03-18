import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import usersRoutes from './routes/usersRoutes';
import { loggerMiddleware } from './middlewares/loggerMiddleware';
import { errorMiddleware } from './middlewares/errorMiddleware';

dotenv.config();

const app: Application = express();

app.use(loggerMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'CHUTE API is running' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);

app.use(errorMiddleware);

export default app;
