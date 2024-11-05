import {USER_ROLES} from '@utils/constants';

export type PaginatedResponse<T> = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: T[];
};

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export type UserInfoTokenContext = {
  id: string;
  username?: string;
  email: string;
  roles: UserRole[];
};
export type TokenContext = {
  userInfo: UserInfoTokenContext;
};
