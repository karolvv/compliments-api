import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {SwaggerTheme, SwaggerThemeNameEnum} from 'swagger-themes';

const theme = new SwaggerTheme();

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Compliments API',
      version: '1.0.0',
      description: 'API for compliments',
      contact: {
        name: 'Karol Vitangcol',
        email: 'karol.vitangcol@gmail.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },

    servers: [
      {
        url: process.env.API_URL || 'http://localhost:4000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT obtained from login or refresh',
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/models/*.ts',
    './src/types/*.ts',
    './src/utils/errors.ts',
  ],
};

const swaggerSpecification = {
  ...swaggerJsdoc(options),
  explorer: true,
  theme: theme.getBuffer(SwaggerThemeNameEnum.ONE_DARK),
};

export {swaggerSpecification, swaggerUi};
