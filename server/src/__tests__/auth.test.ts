import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/auth';
import { prisma } from './setup';
import { createMockUser, setupTestApp } from './setup';

// Setup Express app for testing
const app = setupTestApp();
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = createMockUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('כתובת דוא"ל או סיסמה שגויים');
    });

    it('should fail with invalid password', async () => {
      const mockUser = createMockUser({
        password: await bcrypt.hash('correctpassword', 12),
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with inactive user', async () => {
      const mockUser = createMockUser({
        isActive: false,
        password: await bcrypt.hash('password123', 12),
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('החשבון אינו פעיל. פנה למנהל המערכת');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('כתובת דוא"ל לא תקינה');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('סיסמה חייבת להכיל לפחות 6 תווים');
    });

    it('should update last login timestamp', async () => {
      const mockUser = createMockUser({
        password: await bcrypt.hash('password123', 12),
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register first user as admin', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createMockUser({ role: 'ADMIN' }));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!',
          firstName: 'Admin',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('ADMIN');
    });

    it('should prevent duplicate email registration', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findUnique.mockResolvedValue(createMockUser());

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('משתמש עם כתובת דוא"ל זו כבר קיים');
    });

    it('should validate password complexity', async () => {
      prisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weakpass',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('סיסמה חייבת להכיל אות קטנה, אות גדולה ומספר');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = createMockUser();
      const refreshToken = jwt.sign(
        { userId: mockUser.id },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '30d' }
      );

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent user', async () => {
      const refreshToken = jwt.sign(
        { userId: 'non-existent' },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '30d' }
      );

      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('משתמש לא קיים או לא פעיל');
    });
  });
});