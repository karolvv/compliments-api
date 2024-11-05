import {Compliment} from '@models/compliment';
import {ComplimentDocument} from '@app/types/compliment';
import {Types} from 'mongoose';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ValidationError,
} from '@utils/errors';
import {PaginatedResponse} from '@app/types/shared';

export class ComplimentService {
  async getRandomCompliment(): Promise<ComplimentDocument | null> {
    const count = await Compliment.countDocuments();
    if (count === 0) return null;
    const randomIndex = Math.floor(Math.random() * count);
    const randomCompliment = await Compliment.findOne().skip(randomIndex);

    if (!randomCompliment) {
      throw new NotFoundError('Compliment');
    }

    return randomCompliment.toObject() as ComplimentDocument;
  }

  async getComplimentById(id: string): Promise<ComplimentDocument | null> {
    const compliment = await Compliment.findById(id);

    if (!compliment) {
      throw new NotFoundError('Compliment');
    }

    return compliment;
  }

  async getCompliments({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<ComplimentDocument>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Compliment.find().sort({createdAt: -1}).skip(skip).limit(limit),
      Compliment.countDocuments(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async createCompliment({
    text,
    authorId,
  }: {
    text: string;
    authorId: string;
  }): Promise<ComplimentDocument> {
    const newCompliment = new Compliment({text, authorId});
    return await newCompliment.save();
  }

  async updateCompliment(
    id: string,
    ComplimentDocument: Partial<ComplimentDocument>,
    authorId?: string,
  ): Promise<ComplimentDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid compliment ID');
    }

    const existingCompliment = await this.getComplimentById(id);
    if (!existingCompliment) {
      throw new NotFoundError('Compliment');
    }

    if (authorId && existingCompliment.authorId?.toString() !== authorId) {
      throw new ForbiddenError(
        'You are not authorized to update this compliment',
      );
    }

    if (
      ComplimentDocument.text &&
      ComplimentDocument.text === existingCompliment.text
    ) {
      throw new BadRequestError(
        'Compliment text must be different from the original text.',
      );
    }

    return await Compliment.findByIdAndUpdate(
      id,
      {
        ...ComplimentDocument,
        $inc: {__v: 1},
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async deleteCompliment(
    complimentId: string,
  ): Promise<ComplimentDocument | null> {
    const deletedCompliment = await Compliment.findByIdAndDelete(complimentId);
    if (!deletedCompliment) {
      throw new NotFoundError('Compliment');
    }

    return deletedCompliment;
  }
}
