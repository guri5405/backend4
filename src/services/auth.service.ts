import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { SafeUser, User } from '../types';

function toSafeUser(user: User): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const password_hash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password_hash,
      role: input.role || 'user',
    });

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    return { user: toSafeUser(user), token };
  },

  async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isValid = await comparePassword(input.password, user.password_hash);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    return { user: toSafeUser(user), token };
  },
};
