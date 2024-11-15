import request from 'supertest';
import app, { userService, ApiError } from '../../src/app';
import { UserEntity } from '@smendivil/user';

describe('User API Integration Tests', () => {
  beforeEach(async () => {
    const users = await userService.getAllUsers({ page: 1, limit: 100 });
    await Promise.all(
      users.data.map((user) => userService.deleteUser(user.id))
    );
  });

  describe('POST /users', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        phoneNumber: '1234567890'
      };

      const response = await request(app)
        .post('/users')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        username: userData.username,
        email: userData.email,
        phoneNumber: userData.phoneNumber
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const testCases = [
        {},
        { username: 'test' },
        { email: 'test@example.com' },
        { phoneNumber: '1234567890' },
        { username: 'test', email: 'test@example.com' },
        { username: 'test', phoneNumber: '1234567890' },
        { email: 'test@example.com', phoneNumber: '1234567890' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/users')
          .send(testCase);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      }
    });

    it('should handle unexpected errors from service', async () => {
      const testError = new Error('Database error');
      const originalAddUser = userService.addUser;
      userService.addUser = jest.fn().mockRejectedValue(testError);

      const response = await request(app)
        .post('/users')
        .send({
          username: 'test',
          email: 'test@example.com',
          phoneNumber: '1234567890'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: testError.message,
        status: 500
      });

      userService.addUser = originalAddUser;
    });

    it('should handle service error with custom status', async () => {
      const testError: ApiError = new Error('Validation error');
      testError.statusCode = 422;

      const originalAddUser = userService.addUser;
      userService.addUser = jest.fn().mockRejectedValue(testError);

      const response = await request(app)
        .post('/users')
        .send({
          username: 'test',
          email: 'test@example.com',
          phoneNumber: '1234567890'
        });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        error: testError.message,
        status: 422
      });

      userService.addUser = originalAddUser;
    });

    it('should handle null values in required fields', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: null,
          email: null,
          phoneNumber: null
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required fields',
        status: 400
      });
    });

    it('should handle empty string values in required fields', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: '',
          email: '',
          phoneNumber: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required fields',
        status: 400
      });
    });
  });

  describe('GET /users', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 15; i++) {
        await userService.addUser(
          `user${i}`,
          `user${i}@example.com`,
          `${i}`.padStart(10, '0')
        );
      }
    });

    it('should return paginated users with default pagination', async () => {
      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.total).toBe(15);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.hasNext).toBe(true);
    });

    it('should respect custom pagination parameters', async () => {
      const response = await request(app)
        .get('/users')
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(5);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/users')
        .query({ page: -1, limit: -5 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should handle non-numeric pagination parameters', async () => {
      const response = await request(app)
        .get('/users')
        .query({ page: 'invalid', limit: 'invalid' });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('GET /users/:id', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await userService.addUser('testuser', 'test@example.com', '1234567890');
    });

    it('should return user by id', async () => {
      const response = await request(app).get(`/users/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        phoneNumber: testUser.phoneNumber
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/users/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle service errors', async () => {
      const originalGetById = userService.getUserById;
      userService.getUserById = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get(`/users/${testUser.id}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');

      userService.getUserById = originalGetById;
    });
  });

  describe('PUT /users/:id', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await userService.addUser('testuser', 'test@example.com', '1234567890');
    });

    it('should update user with valid data', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
        phoneNumber: '0987654321'
      };

      const response = await request(app)
        .put(`/users/${testUser.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updateData);
      expect(response.body.id).toBe(testUser.id);
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put(`/users/${testUser.id}`)
        .send({ username: 'updateduser' });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('updateduser');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.phoneNumber).toBe(testUser.phoneNumber);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/users/nonexistent-id')
        .send({ username: 'updateduser' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle service errors', async () => {
      const originalUpdateUser = userService.updateUser;
      userService.updateUser = jest.fn().mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put(`/users/${testUser.id}`)
        .send({ username: 'updateduser' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Update failed');

      userService.updateUser = originalUpdateUser;
    });
  });

  describe('DELETE /users/:id', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await userService.addUser('testuser', 'test@example.com', '1234567890');
    });

    it('should delete existing user', async () => {
      const response = await request(app).delete(`/users/${testUser.id}`);

      expect(response.status).toBe(204);

      const getResponse = await request(app).get(`/users/${testUser.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).delete('/users/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle service errors', async () => {
      const originalDeleteUser = userService.deleteUser;
      userService.deleteUser = jest.fn().mockRejectedValue(new Error('Delete failed'));

      const response = await request(app)
        .delete(`/users/${testUser.id}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Delete failed');

      userService.deleteUser = originalDeleteUser;
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with custom status codes', async () => {
      const originalAddUser = userService.addUser;
      const customError: ApiError = new Error('Custom error');
      customError.statusCode = 422;
      userService.addUser = jest.fn().mockRejectedValue(customError);

      const response = await request(app)
        .post('/users')
        .send({
          username: 'test',
          email: 'test@example.com',
          phoneNumber: '1234567890'
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Custom error');
      expect(response.body.status).toBe(422);

      userService.addUser = originalAddUser;
    });
  });
});