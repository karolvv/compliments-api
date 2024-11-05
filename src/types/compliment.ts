import {Document, Types} from 'mongoose';

export interface ComplimentDocument extends Document {
  _id: Types.ObjectId;
  text: string;
  authorId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
