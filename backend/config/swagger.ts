// backend/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HopeGestion API',
            version: '1.0.1',
            description: `
API REST de la plateforme **HopeGestion** — Gestion immobilière SaaS.

## Authentification
Toutes les routes protégées nécessitent un **Bearer token** JWT dans l'en-tête \`Authorization\`.

\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Le token est obtenu via \`POST /api/auth/login\` ou \`POST /api/auth/refresh\`.

## Pagination
Les endpoints de liste acceptent les paramètres \`?page=1&limit=20\` (max 100).

La réponse paginée a la structure :
\`\`\`json
{ "data": [], "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
\`\`\`
            `.trim(),
            contact: {
                name: 'HopeGestion Support',
                email: 'support@hopegestion.com',
            },
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://hope-gestion-backend.onrender.com/api'
                    : 'http://localhost:5000/api',
                description: process.env.NODE_ENV === 'production' ? 'Production' : 'Développement local',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Access token JWT obtenu via /auth/login',
                },
            },
            schemas: {
                // ── Réponse paginée générique ─────────────────────────────
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        data:       { type: 'array', items: {} },
                        total:      { type: 'integer', example: 42 },
                        page:       { type: 'integer', example: 1 },
                        limit:      { type: 'integer', example: 20 },
                        totalPages: { type: 'integer', example: 3 },
                    },
                },
                // ── Erreur standard ───────────────────────────────────────
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Ressource introuvable.' },
                    },
                },
                // ── Auth ──────────────────────────────────────────────────
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email:    { type: 'string', format: 'email', example: 'gestionnaire@example.com' },
                        password: { type: 'string', format: 'password', example: 'MonMotDePasse1!' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        message:      { type: 'string', example: 'Connexion réussie.' },
                        token:        { type: 'string', description: 'Access token JWT (15 min)' },
                        refreshToken: { type: 'string', description: 'Refresh token (7 jours)' },
                        role:         { type: 'string', example: 'gestionnaire' },
                        userId:       { type: 'integer', example: 1 },
                    },
                },
                // ── Task ──────────────────────────────────────────────────
                Task: {
                    type: 'object',
                    properties: {
                        id:          { type: 'integer' },
                        title:       { type: 'string', example: 'Relancer le locataire du lot A3' },
                        description: { type: 'string' },
                        status:      { type: 'string', enum: ['todo', 'in_progress', 'done'] },
                        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
                        due_date:    { type: 'string', format: 'date', example: '2026-04-30' },
                        assigned_to: { type: 'integer', nullable: true },
                        created_by:  { type: 'integer' },
                        created_at:  { type: 'string', format: 'date-time' },
                    },
                },
                TaskCreate: {
                    type: 'object',
                    required: ['title'],
                    properties: {
                        title:       { type: 'string', example: 'Vérifier l\'état du lot B2' },
                        description: { type: 'string' },
                        priority:    { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                        due_date:    { type: 'string', format: 'date' },
                        assigned_to: { type: 'integer', nullable: true },
                        entity_type: { type: 'string', example: 'lot' },
                        entity_id:   { type: 'integer' },
                    },
                },
                // ── Note ──────────────────────────────────────────────────
                Note: {
                    type: 'object',
                    properties: {
                        id:         { type: 'integer' },
                        title:      { type: 'string', example: 'Notes visite lot A1' },
                        content:    { type: 'string' },
                        type:       { type: 'string', enum: ['note', 'reminder', 'observation'] },
                        visibility: { type: 'string', enum: ['private', 'shared'] },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                // ── Provider ──────────────────────────────────────────────
                Provider: {
                    type: 'object',
                    properties: {
                        id:           { type: 'integer' },
                        name:         { type: 'string', example: 'Plomberie Bénin SARL' },
                        specialty:    { type: 'string', example: 'plomberie' },
                        contact_name: { type: 'string' },
                        phone:        { type: 'string' },
                        email:        { type: 'string', format: 'email' },
                        address:      { type: 'string' },
                        status:       { type: 'string', enum: ['active', 'inactive'] },
                    },
                },
            },
        },
        security: [{ BearerAuth: [] }],
        tags: [
            { name: 'Auth',      description: 'Authentification et gestion des sessions' },
            { name: 'Tasks',     description: 'Tâches et assignations' },
            { name: 'Notebook',  description: 'Carnet de bord — notes et contacts' },
            { name: 'Providers', description: 'Prestataires de services' },
            { name: 'Tickets',   description: 'Tickets d\'intervention' },
            { name: 'Documents', description: 'Gestion documentaire' },
            { name: 'Finance',   description: 'Finances et dépenses' },
        ],
    },
    // Fichiers à scanner pour les annotations JSDoc @swagger
    apis: [
        path.join(__dirname, '../routes/*.ts'),
        path.join(__dirname, '../routes/*.js'),
    ],
};

export const swaggerSpec = swaggerJsdoc(options);
