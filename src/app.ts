import express, { Request, Response, NextFunction } from 'express';
import {
  UserService,
  InMemoryUserRepository,
  PaginationParams
} from '@smendivil/user';

export interface ApiError extends Error {
  statusCode?: number;
}

const app = express();

app.use(express.json());

export const userRepository = new InMemoryUserRepository();
export const userService = new UserService(userRepository);

const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message,
    status: statusCode
  });
};

app.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, phoneNumber } = req.body;

    if (!username || !email || !phoneNumber) {
      const error: ApiError = new Error('Missing required fields');
      error.statusCode = 400;
      throw error;
    }

    const user = await userService.addUser(username, email, phoneNumber);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const params: PaginationParams = { page, limit };
    const users = await userService.getAllUsers(params);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, phoneNumber } = req.body;
    const user = await userService.updateUser(
      req.params.id,
      username,
      email,
      phoneNumber
    );

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await userService.deleteUser(req.params.id);
    if (!success) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

export default app;


