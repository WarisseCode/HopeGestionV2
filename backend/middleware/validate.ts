// backend/middleware/validate.ts
//
// Middleware de validation d'entrée partagé (express-validator).
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI : la logique `validationResult(req) -> 400` était dupliquée dans chaque
// fichier de route qui validait (taskRoutes, notebookRoutes). On la factorise ici
// pour pouvoir l'étendre à toutes les routes sans copier-coller.
//
// USAGE :
//   import { body } from 'express-validator';
//   import { validate } from '../middleware/validate';
//
//   const rules = [ body('montant').isFloat({ gt: 0 }).withMessage('Montant invalide') ];
//   router.post('/', permissions.canWrite('finance'), tenantGuard, validate(rules), handler);
//
// `validate(rules)` renvoie [...rules, handleValidation]. Express aplatit les
// tableaux de middlewares, donc on le passe comme un seul argument.
// On le place APRÈS les guards d'auth/permission (sécurité d'abord) et AVANT le handler.
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Étape terminale de la chaîne de validation : si des règles ont échoué,
 * renvoie 400 + le détail des erreurs ; sinon passe au handler suivant.
 * Format de réponse identique à l'existant (taskRoutes) : { errors: [...] }.
 */
export const handleValidation: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

/**
 * Compose une liste de règles avec le handler de validation terminal.
 * Retourne un tableau de middlewares directement utilisable par Express.
 */
export const validate = (rules: ValidationChain[]): RequestHandler[] => [
  ...(rules as unknown as RequestHandler[]),
  handleValidation,
];
