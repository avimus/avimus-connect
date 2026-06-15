export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ávimus Connect — External API',
    version: '1.0.0',
    description: 'API REST externa para integração com a plataforma Ávimus Connect. Autenticação via header `X-API-Key`.',
  },
  servers: [{ url: '/api/external', description: 'Base URL' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      ClientSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          totalInstances: { type: 'integer' },
          onlineInstances: { type: 'integer' },
        },
      },
      Instance: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['online', 'offline', 'waiting_qr', 'error', 'unknown'] },
          wppSessionId: { type: 'string' },
          wppToken: { type: 'string', nullable: true },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
      Metrics: {
        type: 'object',
        properties: {
          totalClients: { type: 'integer' },
          totalInstances: { type: 'integer' },
          onlineInstances: { type: 'integer' },
          offlineInstances: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/instances': {
      get: {
        summary: 'Listar todas as instâncias',
        tags: ['Instâncias'],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Instance' } } } } } },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/instances/{id}': {
      get: {
        summary: 'Buscar instância por ID',
        tags: ['Instâncias'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Instance' } } } },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/instances/{id}/reconnect': {
      post: {
        summary: 'Reconectar instância',
        tags: ['Instâncias'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '202': {
            description: 'Reconexão iniciada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instanceId: { type: 'string' },
                    status: { type: 'string', enum: ['waiting_qr'] },
                    qrcode: { type: 'string', nullable: true },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Instância já está online', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Instância não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/clients': {
      get: {
        summary: 'Listar todos os clientes',
        tags: ['Clientes'],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ClientSummary' } } } } } },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/clients/{id}/instances': {
      get: {
        summary: 'Instâncias de um cliente',
        tags: ['Clientes'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Instance' } } } } } },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Cliente não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/metrics': {
      get: {
        summary: 'Métricas globais',
        tags: ['Métricas'],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Metrics' } } } },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
}
