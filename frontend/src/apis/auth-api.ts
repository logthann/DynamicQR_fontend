/**
 * Auth API Module
 *
 * Endpoints: POST /api/v1/auth/register, POST /api/v1/auth/login
 */

import { getAPIClient } from './base-client';
import * as Types from './generated/types';

export async function register(req: Types.RegisterRequest): Promise<Types.RegisterResponse> {
  const response = await getAPIClient().post('/auth/register', req);
  return response.data;
}

export async function login(req: Types.LoginRequest): Promise<Types.LoginResponse> {
  const response = await getAPIClient().post('/auth/login', req);
  return response.data;
}
