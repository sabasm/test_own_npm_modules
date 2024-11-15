import request from 'supertest';
import app, { userService } from '../src/app';
import { UserEntity } from '@smendivil/user';

describe('User API', () => {
  beforeEach(async () => {
    const users = await userService.getAllUsers({ page: 1, limit: 100 });
    await Promise.all(
      users.data.map((user: UserEntity) => userService.deleteUser(user.id))
    );
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          phoneNumber: '1234567890'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.phoneNumber).toBe('1234567890');
    });

    it('should handle errors in POST /users', async () => {
      const originalAddUser = userService.addUser;
      userService.addUser = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/users')
        .send({
          username: 'user',
          email: 'user@example.com',
          phoneNumber: '1234567890'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');

      userService.addUser = originalAddUser;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          // Missing fields: email and phoneNumber
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });
  });


  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      const user = await userService.addUser('testuser', 'test@example.com', '1234567890');

      const response = await request(app)
        .get(`/users/${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.username).toBe('testuser');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/non-existent-id');

      expect(response.status).toBe(404);
    });

    it('should handle errors in GET /users/:id', async () => {
      const originalGetUserById = userService.getUserById;
      userService.getUserById = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/users/non-existent-id');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');

      userService.getUserById = originalGetUserById;
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', async () => {
      const user = await userService.addUser('testuser', 'test@example.com', '1234567890');

      const response = await request(app)
        .put(`/users/${user.id}`)
        .send({
          username: 'updated',
          email: 'updated@example.com',
          phoneNumber: '0987654321'
        });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('updated');
      expect(response.body.email).toBe('updated@example.com');
      expect(response.body.phoneNumber).toBe('0987654321');
    });

    it('should handle errors in PUT /users/:id', async () => {
      const user = await userService.addUser('testuser', 'test@example.com', '1234567890');
      const originalUpdateUser = userService.updateUser;
      userService.updateUser = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .put(`/users/${user.id}`)
        .send({
          username: 'updated',
          email: 'updated@example.com',
          phoneNumber: '0987654321'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');

      userService.updateUser = originalUpdateUser;
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      const user = await userService.addUser('testuser', 'test@example.com', '1234567890');

      const response = await request(app)
        .delete(`/users/${user.id}`);

      expect(response.status).toBe(204);

      const getResponse = await request(app)
        .get(`/users/${user.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should handle errors in DELETE /users/:id', async () => {
      const user = await userService.addUser('testuser', 'test@example.com', '1234567890');
      const originalDeleteUser = userService.deleteUser;
      userService.deleteUser = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app).delete(`/users/${user.id}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');

      userService.deleteUser = originalDeleteUser;
    });
  });
});
