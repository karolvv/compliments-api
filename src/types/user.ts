import {Document} from 'mongoose';
import {UserRole} from './shared';

export interface UserDocument extends Document {
  id: string;
  username: string;
  email: string;
  password: string;
  roles: UserRole[];
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
