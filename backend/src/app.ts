import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import usersRoutes from './routes/usersRoutes';
import matchRoutes from './routes/matchRoutes';
import teamRoutes from './routes/teamRoutes';
import postRoutes from './routes/postRoutes';
import courtRoutes from './routes/courtRoutes';
import statSessionRoutes from './routes/statSessionRoutes';
import miscRoutes from './routes/miscRoutes';
import { loggerMiddleware } from './middlewares/loggerMiddleware';
import { errorMiddleware } from './middlewares/errorMiddleware';

dotenv.config();

const app: Application = express();

app.use(loggerMiddleware);
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/matches', matchRoutes);
app.use('/teams', teamRoutes);
app.use('/posts', postRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/stat-sessions', statSessionRoutes);
app.use('/api', miscRoutes);

app.use(errorMiddleware);

export default app;
