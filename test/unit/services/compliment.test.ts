import {ComplimentService} from '@services/compliment';
import {Compliment} from '@models/compliment';
import {Types} from 'mongoose';
import {NotFoundError, ForbiddenError, BadRequestError} from '@utils/errors';

jest.mock('@models/compliment');

describe('ComplimentService', () => {
  let complimentService: ComplimentService;
  const MockCompliment = Compliment as jest.Mocked<typeof Compliment>;

  beforeEach(() => {
    complimentService = new ComplimentService();
    jest.clearAllMocks();
  });

  describe('getRandomCompliment', () => {
    it('should return a random compliment', async () => {
      const mockId = new Types.ObjectId();
      const mockAuthorId = new Types.ObjectId();
      const mockCompliment = {
        _id: mockId,
        text: 'You are awesome!',
        authorId: mockAuthorId,
        toObject: () => ({
          _id: mockId,
          text: 'You are awesome!',
          authorId: mockAuthorId,
        }),
      };

      MockCompliment.countDocuments.mockResolvedValue(1);
      MockCompliment.findOne.mockReturnValue({
        skip: jest.fn().mockResolvedValue(mockCompliment),
      } as any);

      const result = await complimentService.getRandomCompliment();
      expect(result).toEqual(mockCompliment.toObject());
    });

    it('should return null when no compliments exist', async () => {
      MockCompliment.countDocuments.mockResolvedValue(0);
      const result = await complimentService.getRandomCompliment();
      expect(result).toBeNull();
    });
  });

  describe('getComplimentById', () => {
    it('should return a compliment by id', async () => {
      const mockCompliment = {
        _id: new Types.ObjectId(),
        text: 'You are great!',
        authorId: new Types.ObjectId(),
      };

      MockCompliment.findById.mockResolvedValue(mockCompliment);
      const result = await complimentService.getComplimentById(
        mockCompliment._id.toString(),
      );
      expect(result).toEqual(mockCompliment);
    });

    it('should throw NotFoundError when compliment does not exist', async () => {
      MockCompliment.findById.mockResolvedValue(null);
      await expect(complimentService.getComplimentById('123')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getCompliments', () => {
    it('should return paginated compliments', async () => {
      const mockCompliments = [{text: 'Compliment 1'}, {text: 'Compliment 2'}];
      const total = 10;

      MockCompliment.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockCompliments),
          }),
        }),
      } as any);
      MockCompliment.countDocuments.mockResolvedValue(total);

      const result = await complimentService.getCompliments({
        page: 1,
        limit: 2,
      });
      expect(result).toEqual({
        page: 1,
        limit: 2,
        total,
        totalPages: 5,
        data: mockCompliments,
      });
    });
  });

  describe('createCompliment', () => {
    it('should create a new compliment', async () => {
      const mockCompliment = {
        text: 'New compliment',
        authorId: new Types.ObjectId().toString(),
      };

      const savedCompliment = {...mockCompliment, _id: new Types.ObjectId()};
      MockCompliment.prototype.save.mockResolvedValue(savedCompliment);

      const result = await complimentService.createCompliment(mockCompliment);
      expect(result).toEqual(savedCompliment);
    });
  });

  describe('updateCompliment', () => {
    const mockId = new Types.ObjectId().toString();
    const mockAuthorId = new Types.ObjectId().toString();

    it('should update a compliment', async () => {
      const existingCompliment = {
        _id: mockId,
        text: 'Old text',
        authorId: mockAuthorId,
      };

      const updatedCompliment = {
        ...existingCompliment,
        text: 'New text',
      };

      MockCompliment.findById.mockResolvedValue(existingCompliment);
      MockCompliment.findByIdAndUpdate.mockResolvedValue(updatedCompliment);

      const result = await complimentService.updateCompliment(
        mockId,
        {text: 'New text'},
        mockAuthorId,
      );

      expect(result).toEqual(updatedCompliment);
    });

    it('should throw ForbiddenError when author is not authorized', async () => {
      const existingCompliment = {
        _id: mockId,
        text: 'Old text',
        authorId: mockAuthorId,
      };

      MockCompliment.findById.mockResolvedValue(existingCompliment);

      await expect(
        complimentService.updateCompliment(
          mockId,
          {text: 'New text'},
          'different-author-id',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when text is unchanged', async () => {
      const existingCompliment = {
        _id: mockId,
        text: 'Same text',
        authorId: mockAuthorId,
      };

      MockCompliment.findById.mockResolvedValue(existingCompliment);

      await expect(
        complimentService.updateCompliment(
          mockId,
          {text: 'Same text'},
          mockAuthorId,
        ),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteCompliment', () => {
    it('should delete a compliment', async () => {
      const mockCompliment = {
        _id: new Types.ObjectId(),
        text: 'To be deleted',
        authorId: new Types.ObjectId(),
      };

      MockCompliment.findByIdAndDelete.mockResolvedValue(mockCompliment);
      const result = await complimentService.deleteCompliment(
        mockCompliment._id.toString(),
      );
      expect(result).toEqual(mockCompliment);
    });

    it('should throw NotFoundError when compliment does not exist', async () => {
      MockCompliment.findByIdAndDelete.mockResolvedValue(null);
      await expect(complimentService.deleteCompliment('123')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
