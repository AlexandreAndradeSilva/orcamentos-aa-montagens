import { testarContrato } from './contrato';
import { criarRepositorioMemoria } from './memoria';

testarContrato('memoria', () => Promise.resolve(criarRepositorioMemoria()));
