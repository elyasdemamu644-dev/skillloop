export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  isVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}
