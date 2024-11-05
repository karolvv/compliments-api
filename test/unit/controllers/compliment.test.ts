import {ComplimentController} from '@controllers/compliment';
import {ComplimentService} from '@services/compliment';
import {Request, Response, NextFunction} from 'express';
import {ForbiddenError, ValidationError} from '@utils/errors';
import {ComplimentDocument} from '@app/types/compliment';
import {PaginatedResponse} from '@app/types/shared';
import {HTTP_STATUS_CODES, USER_ROLES} from '@utils/constants';
import {ZodError} from 'zod';

jest.mock('@services/compliment');

describe('ComplimentController', () => {
  let complimentController: ComplimentController;
  let mockComplimentService: jest.Mocked<ComplimentService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockComplimentService = {
      getRandomCompliment: jest.fn(),
      getComplimentById: jest.fn(),
      getCompliments: jest.fn(),
      createCompliment: jest.fn(),
      updateCompliment: jest.fn(),
      deleteCompliment: jest.fn(),
    } as unknown as jest.Mocked<ComplimentService>;

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    complimentController = new ComplimentController(mockComplimentService);
  });

  describe('getRandomCompliment', () => {
    it('should return a random compliment', async () => {
      const mockCompliment = {
        _id: '1',
        text: 'You are awesome!',
      } as unknown as ComplimentDocument;
      mockComplimentService.getRandomCompliment.mockResolvedValue(
        mockCompliment,
      );

      mockReq = {};
      await complimentController.getRandomCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.getRandomCompliment).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockCompliment);
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      mockComplimentService.getRandomCompliment.mockRejectedValue(error);

      mockReq = {};
      await complimentController.getRandomCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getComplimentById', () => {
    it('should return a compliment when valid ID is provided', async () => {
      const mockCompliment = {
        _id: '507f1f77bcf86cd799439011',
        text: 'Great job!',
      } as unknown as ComplimentDocument;
      mockComplimentService.getComplimentById.mockResolvedValue(mockCompliment);

      mockReq = {
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.getComplimentById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.getComplimentById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockCompliment);
    });

    it('should throw ValidationError for invalid ID', async () => {
      mockReq = {
        params: {id: 'invalid-id'},
      };

      await complimentController.getComplimentById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('getCompliments', () => {
    it('should return paginated compliments with default values', async () => {
      const mockPaginatedResponse = {
        data: [{_id: '1', text: 'Nice!'} as unknown as ComplimentDocument],
        total: 1,
        page: 1,
        limit: 10,
      } as PaginatedResponse<ComplimentDocument>;
      mockComplimentService.getCompliments.mockResolvedValue(
        mockPaginatedResponse,
      );

      mockReq = {
        query: {},
      };

      await complimentController.getCompliments(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.getCompliments).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('should handle custom pagination values', async () => {
      const mockReq = {
        query: {page: '2', limit: '20'},
      };

      await complimentController.getCompliments(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext,
      );

      expect(mockComplimentService.getCompliments).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
      });
    });

    it('should throw ValidationError for invalid pagination values', async () => {
      const mockReq = {
        query: {page: '-1', limit: 'invalid'},
      };

      await complimentController.getCompliments(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle maximum pagination limits', async () => {
      mockReq = {
        query: {page: '1', limit: '1000'},
      };

      await complimentController.getCompliments(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle string-based pagination values', async () => {
      mockReq = {
        query: {page: 'abc', limit: 'def'},
      };

      await complimentController.getCompliments(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createCompliment', () => {
    it('should create a new compliment', async () => {
      const mockCompliment = {
        _id: '1',
        text: 'You rock!',
        authorId: '507f1f77bcf86cd799439011',
      } as unknown as ComplimentDocument;
      mockComplimentService.createCompliment.mockResolvedValue(mockCompliment);

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        roles: [USER_ROLES.USER],
        body: {text: 'You rock!'},
      };

      await complimentController.createCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.createCompliment).toHaveBeenCalledWith({
        text: 'You rock!',
        authorId: '507f1f77bcf86cd799439011',
      });
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompliment);
    });

    it('should throw ValidationError for invalid user ID', async () => {
      const mockReq = {
        user: {id: 'invalid-id'},
        body: {text: 'You rock!'},
      };

      await complimentController.createCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate minimum text length', async () => {
      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        body: {text: ''},
      };

      await complimentController.createCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should handle missing text field', async () => {
      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        body: {},
      };

      await complimentController.createCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });

  describe('updateCompliment', () => {
    it('should update a compliment', async () => {
      const mockCompliment = {
        _id: '507f1f77bcf86cd799439011',
        text: 'Updated text',
      } as unknown as ComplimentDocument;
      mockComplimentService.updateCompliment.mockResolvedValue(mockCompliment);

      mockReq = {
        params: {id: '507f1f77bcf86cd799439011'},
        body: {text: 'Updated text'},
      };

      await complimentController.updateCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.updateCompliment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {text: 'Updated text'},
        undefined,
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockCompliment);
    });

    it('should throw ValidationError for invalid compliment ID', async () => {
      const mockReq = {
        params: {id: 'invalid-id'},
        body: {text: 'Updated text'},
      };

      await complimentController.updateCompliment(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('deleteCompliment', () => {
    it('should delete a compliment when user is the author', async () => {
      const mockCompliment = {
        _id: '507f1f77bcf86cd799439011',
        authorId: '507f1f77bcf86cd799439011',
      } as unknown as ComplimentDocument;
      mockComplimentService.getComplimentById.mockResolvedValue(mockCompliment);
      mockComplimentService.deleteCompliment.mockResolvedValue(mockCompliment);

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.getComplimentById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockComplimentService.deleteCompliment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Compliment deleted successfully',
      });

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        roles: [USER_ROLES.USER],
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.deleteCompliment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Compliment deleted successfully',
      });
    });

    it('should throw ForbiddenError when user is not the author', async () => {
      const mockCompliment = {
        _id: '507f1f77bcf86cd799439011',
        authorId: '507f1f77bcf86cd799439012',
      } as unknown as ComplimentDocument;
      mockComplimentService.getComplimentById.mockResolvedValue(mockCompliment);

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        roles: [USER_ROLES.USER],
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should throw ValidationError for invalid user ID', async () => {
      const mockReq = {
        user: {id: 'invalid-id'},
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as unknown as Request,
        mockRes as unknown as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should allow admin to delete any compliment', async () => {
      const mockCompliment = {
        _id: '507f1f77bcf86cd799439011',
        authorId: '507f1f77bcf86cd799439012', // Different author
      } as unknown as ComplimentDocument;

      mockComplimentService.getComplimentById.mockResolvedValue(mockCompliment);
      mockComplimentService.deleteCompliment.mockResolvedValue(mockCompliment);

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.ADMIN],
        },
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockComplimentService.deleteCompliment).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Compliment deleted successfully',
      });
    });

    it('should handle service errors during deletion', async () => {
      const error = new Error('Database error');
      mockComplimentService.getComplimentById.mockRejectedValue(error);

      mockReq = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
        params: {id: '507f1f77bcf86cd799439011'},
      };

      await complimentController.deleteCompliment(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
