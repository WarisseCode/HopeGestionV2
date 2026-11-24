/** Documentation de l'API (Swagger) coupée en production — audit S8. */
import { isApiDocsEnabled } from '../../config/apiDocs';

describe('isApiDocsEnabled', () => {
    it.each([
        [{ NODE_ENV: 'production' }, false],
        [{ NODE_ENV: 'production', API_DOCS_ENABLED: 'false' }, false],
        [{ NODE_ENV: 'production', API_DOCS_ENABLED: '1' }, false],      // seule la valeur « true » active
        [{ NODE_ENV: 'production', API_DOCS_ENABLED: 'true' }, true],
        [{ NODE_ENV: 'development' }, true],
        [{ NODE_ENV: 'test' }, true],
        [{}, true],                                                     // poste de développement sans NODE_ENV
    ])('%j → %s', (env, expected) => {
        expect(isApiDocsEnabled(env as NodeJS.ProcessEnv)).toBe(expected);
    });
});
