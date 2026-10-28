import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAccessToken } from '../src/services/auth.service';
import { getTestPrisma, makeApp, testConfig } from './helpers';

describe('authentication and authorization', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof makeApp>;
  const config = testConfig();

  beforeAll(async () => {
    prisma = getTestPrisma();
    app = makeApp({ prisma });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const DEMO_PW = 'Demo-Only-Password-1!';

  describe('registration (Task 1, 2)', () => {
    const testEmail = `new-farmer-${Date.now()}@test.agritrace.org`;

    it('successfully registers a user with hashed password and returns tokens', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'New Test Farmer',
        email: testEmail,
        password: 'Valid-Password-123!',
        role: 'FARMER',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.role).toBe('FARMER');
      expect(res.body.data.user.status).toBe('ACTIVE');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();

      // Verify password was NOT stored in plaintext
      const inDb = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(inDb).not.toBeNull();
      expect(inDb?.passwordHash).not.toContain('Valid-Password-123!');
      expect(inDb?.passwordHash).toMatch(/^\$2[aby]\$/); // valid bcrypt hash pattern
    });

    it('rejects registration with duplicate email (409 CONFLICT)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate Farmer',
        email: testEmail,
        password: 'Valid-Password-123!',
        role: 'FARMER',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects password shorter than 8 characters', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Short Pass',
        email: `short-${Date.now()}@test.org`,
        password: 'short',
        role: 'CONSUMER',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects self-registration as ADMIN', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Fake Admin',
        email: `fake-admin-${Date.now()}@test.org`,
        password: 'Valid-Password-123!',
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('login and credentials (Task 1, 9)', () => {
    it('successfully logs in with valid credentials and returns tokens', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'farmer@demo.agritrace.test',
        password: DEMO_PW,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('farmer@demo.agritrace.test');
      expect(res.body.data.user.role).toBe('FARMER');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
    });

    it('rejects incorrect password with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'farmer@demo.agritrace.test',
        password: 'wrong-password-here',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Invalid email or password');
    });

    it('rejects non-existent email with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'does-not-exist@demo.agritrace.test',
        password: DEMO_PW,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks login for PENDING accounts (403 FORBIDDEN)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'pending@demo.agritrace.test',
        password: DEMO_PW,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('pending approval');
    });

    it('blocks login for SUSPENDED accounts (403 FORBIDDEN)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'suspended@demo.agritrace.test',
        password: DEMO_PW,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('suspended');
    });
  });

  describe('token refresh and logout (Task 3, 4)', () => {
    it('refreshes access token and rotates the refresh token', async () => {
      const login = await request(app).post('/api/v1/auth/login').send({
        email: 'distributor@demo.agritrace.test',
        password: DEMO_PW,
      });
      const initialRefreshToken = login.body.data.refreshToken;

      const refresh = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: initialRefreshToken,
      });

      expect(refresh.status).toBe(200);
      expect(refresh.body.data.accessToken).toBeTruthy();
      expect(refresh.body.data.refreshToken).toBeTruthy();
      expect(refresh.body.data.refreshToken).not.toBe(initialRefreshToken);

      // Replay check: attempting to use the old refresh token must be rejected
      const replay = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: initialRefreshToken,
      });
      expect(replay.status).toBe(401);
    });

    it('invalidates session on logout', async () => {
      const login = await request(app).post('/api/v1/auth/login').send({
        email: 'wholesaler@demo.agritrace.test',
        password: DEMO_PW,
      });
      const refreshToken = login.body.data.refreshToken;

      const logout = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
      expect(logout.status).toBe(200);
      expect(logout.body.data.success).toBe(true);

      // The logged-out refresh token should now be rejected
      const attempt = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(attempt.status).toBe(401);
    });
  });

  describe('authentication middleware & /auth/me (Task 5, 9)', () => {
    it('returns 401 when accessing protected route without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when accessing protected route with invalid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('returns current user profile with valid token', async () => {
      const login = await request(app).post('/api/v1/auth/login').send({
        email: 'processor@demo.agritrace.test',
        password: DEMO_PW,
      });
      const token = login.body.data.accessToken;

      const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body.data.user.email).toBe('processor@demo.agritrace.test');
      expect(me.body.data.user.role).toBe('PROCESSOR');
    });

    it('blocks access if token has SUSPENDED status', async () => {
      const suspendedToken = createAccessToken(
        {
          id: 'test-id',
          name: 'Suspended User',
          email: 's@test.org',
          role: 'FARMER',
          status: 'SUSPENDED',
        },
        config.JWT_ACCESS_SECRET,
      );

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${suspendedToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('role authorization & admin protection (Task 6, 11)', () => {
    let adminToken: string;
    let farmerToken: string;
    let consumerToken: string;

    beforeAll(async () => {
      const adminLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@demo.agritrace.test',
        password: DEMO_PW,
      });
      adminToken = adminLogin.body.data.accessToken;

      const farmerLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'farmer@demo.agritrace.test',
        password: DEMO_PW,
      });
      farmerToken = farmerLogin.body.data.accessToken;

      const consumerLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'consumer@demo.agritrace.test',
        password: DEMO_PW,
      });
      consumerToken = consumerLogin.body.data.accessToken;
    });

    it('forbids FARMER from accessing administrative endpoint (403 FORBIDDEN)', async () => {
      const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids CONSUMER from accessing administrative endpoint (403 FORBIDDEN)', async () => {
      const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${consumerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN to access administrative endpoint (200 OK)', async () => {
      const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('allows ADMIN to update a user status and view overview', async () => {
      const overview = await request(app).get('/api/v1/admin/overview').set('Authorization', `Bearer ${adminToken}`);
      expect(overview.status).toBe(200);
      expect(overview.body.data.totalUsers).toBeGreaterThan(0);

      // Find pending user and approve them
      const pendingUser = await prisma.user.findFirst({ where: { status: 'PENDING' } });
      expect(pendingUser).not.toBeNull();

      if (pendingUser) {
        const update = await request(app)
          .patch(`/api/v1/admin/users/${pendingUser.id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'ACTIVE' });

        expect(update.status).toBe(200);
        expect(update.body.data.user.status).toBe('ACTIVE');

        // Restore to PENDING for idempotency
        await prisma.user.update({ where: { id: pendingUser.id }, data: { status: 'PENDING' } });
      }
    });
  });

  describe('private record protection (Task 10)', () => {
    let farmerUser: { id: string; token: string };
    let retailerUser: { id: string; token: string };
    let adminToken: string;
    let auditorToken: string;

    beforeAll(async () => {
      const farmerLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'farmer@demo.agritrace.test',
        password: DEMO_PW,
      });
      farmerUser = { id: farmerLogin.body.data.user.id, token: farmerLogin.body.data.accessToken };

      const retailerLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'retailer1@demo.agritrace.test',
        password: DEMO_PW,
      });
      retailerUser = { id: retailerLogin.body.data.user.id, token: retailerLogin.body.data.accessToken };

      const adminLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@demo.agritrace.test',
        password: DEMO_PW,
      });
      adminToken = adminLogin.body.data.accessToken;

      const auditorLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'auditor@demo.agritrace.test',
        password: DEMO_PW,
      });
      auditorToken = auditorLogin.body.data.accessToken;
    });

    it('allows a user to view their own private record', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${farmerUser.id}`)
        .set('Authorization', `Bearer ${farmerUser.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(farmerUser.id);
    });

    it("forbids a user from accessing another user's private record (403 FORBIDDEN)", async () => {
      // Farmer trying to access Retailer's record
      const res = await request(app)
        .get(`/api/v1/users/${retailerUser.id}`)
        .set('Authorization', `Bearer ${farmerUser.token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain("cannot access another user's private records");
    });

    it("allows ADMIN to access another user's private record", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${farmerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(farmerUser.id);
    });

    it("allows AUDITOR to inspect another user's record for regulatory compliance", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${farmerUser.id}`)
        .set('Authorization', `Bearer ${auditorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(farmerUser.id);
    });
  });
});
