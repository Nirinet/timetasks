import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';

// Mock Prisma Client
jest.mock('../index', () => ({
  ...jest.requireActual('../index'),
  prisma: mockDeep<PrismaClient>(),
}));

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test database connection
let prisma: DeepMockProxy<PrismaClient>;

beforeEach(() => {
  const { prisma: prismaMock } = jest.requireMock('../index');
  prisma = prismaMock;
  mockReset(prisma);
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});

// Helper functions for tests
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'EMPLOYEE',
  isActive: true,
  password: '$2a$12$hashed_password',
  phone: null,
  joinDate: new Date(),
  lastLogin: null,
  emailNotifications: true,
  timerAlerts: true,
  language: 'he',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: 'task-123',
  title: 'Test Task',
  description: 'Test Description',
  priority: 'NORMAL',
  status: 'NEW',
  creationDate: new Date(),
  deadline: null,
  timeEstimate: null,
  parentTaskId: null,
  projectId: 'project-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'project-123',
  name: 'Test Project',
  description: 'Test Project Description',
  startDate: new Date(),
  targetDate: null,
  status: 'ACTIVE',
  hoursBudget: null,
  isTemplate: false,
  clientId: 'client-123',
  createdById: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTimeRecord = (overrides = {}) => ({
  id: 'time-123',
  date: new Date(),
  startTime: new Date(),
  endTime: null,
  duration: null,
  description: null,
  status: 'ACTIVE',
  taskId: 'task-123',
  employeeId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// JWT token helper for testing authenticated routes
export const generateTestToken = (userId = 'user-123', role = 'EMPLOYEE') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
};

// Express app helper
export const setupTestApp = () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  return app;
};

// Database transaction mock for testing
export const mockTransaction = async (callback: Function) => {
  const result = await callback(prisma);
  return result;
};

// Export prisma mock for use in tests
export { prisma };