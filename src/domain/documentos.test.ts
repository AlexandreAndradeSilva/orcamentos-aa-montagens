import { describe, expect, it } from 'vitest';
import {
  cepValido,
  cnpjValido,
  cpfValido,
  documentoValido,
  formatarDocumento,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
  tipoDoDocumento,
} from './documentos';

describe('tipoDoDocumento', () => {
  it('decide pelo tamanho', () => {
    expect(tipoDoDocumento('111.444.777-35')).toBe('cpf');
    expect(tipoDoDocumento('66.612.836/0001-55')).toBe('cnpj');
    expect(tipoDoDocumento('123')).toBe('indefinido');
    expect(tipoDoDocumento('')).toBe('indefinido');
  });
});

describe('cpfValido', () => {
  it('aceita CPF com dígito correto', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
    expect(cpfValido('111.444.777-45')).toBe(false);
  });

  it('recusa sequência repetida, que passa na conta mas não é CPF de ninguém', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('000.000.000-00')).toBe(false);
    expect(cpfValido('99999999999')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(cpfValido('1114447773')).toBe(false);
    expect(cpfValido('111444777350')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita o CNPJ da AA Montagens, que veio da planilha', () => {
    expect(cnpjValido('66.612.836/0001-55')).toBe(true);
  });

  it('aceita outros CNPJ conhecidos', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('00.000.000/0001-91')).toBe(true); // Banco do Brasil
  });

  it('recusa dígito errado', () => {
    expect(cnpjValido('66.612.836/0001-56')).toBe(false);
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
  });

  it('recusa sequência repetida', () => {
    expect(cnpjValido('11.111.111/1111-11')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(cnpjValido('66.612.836/0001-5')).toBe(false);
  });
});

describe('documentoValido', () => {
  it('vazio é válido — o campo não é obrigatório', () => {
    expect(documentoValido('')).toBe(true);
    expect(documentoValido('   ')).toBe(true);
  });

  it('valida conforme o tamanho', () => {
    expect(documentoValido('111.444.777-35')).toBe(true);
    expect(documentoValido('66.612.836/0001-55')).toBe(true);
    expect(documentoValido('111.444.777-36')).toBe(false);
  });

  it('recusa número incompleto', () => {
    expect(documentoValido('111.444')).toBe(false);
    expect(documentoValido('66.612.836/0001')).toBe(false);
  });
});

describe('formatarDocumento', () => {
  it('formata CPF e CNPJ', () => {
    expect(formatarDocumento('11144477735')).toBe('111.444.777-35');
    expect(formatarDocumento('66612836000155')).toBe('66.612.836/0001-55');
  });

  it('devolve como veio quando não reconhece', () => {
    expect(formatarDocumento('123')).toBe('123');
  });
});

describe('mascararDocumento', () => {
  it('vai formatando enquanto se digita o CPF', () => {
    expect(mascararDocumento('111')).toBe('111');
    expect(mascararDocumento('1114')).toBe('111.4');
    expect(mascararDocumento('111444777')).toBe('111.444.777');
    expect(mascararDocumento('11144477735')).toBe('111.444.777-35');
  });

  it('vira máscara de CNPJ ao passar de 11 dígitos', () => {
    expect(mascararDocumento('666128360001')).toBe('66.612.836/0001');
    expect(mascararDocumento('66612836000155')).toBe('66.612.836/0001-55');
  });

  it('não deixa passar de 14 dígitos', () => {
    expect(mascararDocumento('666128360001559999')).toBe('66.612.836/0001-55');
  });

  it('ignora o que não é dígito', () => {
    expect(mascararDocumento('66.612.836/0001-55')).toBe('66.612.836/0001-55');
    expect(mascararDocumento('abc111def444')).toBe('111.444');
  });
});

describe('mascararCep', () => {
  it('formata e limita', () => {
    expect(mascararCep('16202044')).toBe('16202-044');
    expect(mascararCep('16202')).toBe('16202');
    expect(mascararCep('162020449999')).toBe('16202-044');
  });

  it('valida o tamanho', () => {
    expect(cepValido('16202-044')).toBe(true);
    expect(cepValido('')).toBe(true);
    expect(cepValido('16202')).toBe(false);
  });
});

describe('mascararTelefone', () => {
  it('formata celular e fixo', () => {
    expect(mascararTelefone('18998230660')).toBe('(18) 99823-0660');
    expect(mascararTelefone('1836421234')).toBe('(18) 3642-1234');
  });

  it('formata enquanto digita', () => {
    expect(mascararTelefone('18')).toBe('18');
    expect(mascararTelefone('1899')).toBe('(18) 99');
    expect(mascararTelefone('189982')).toBe('(18) 9982');
  });
});
