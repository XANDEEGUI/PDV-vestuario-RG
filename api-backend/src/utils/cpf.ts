// Remove tudo que não for número: "529.982.247-25" vira "52998224725"
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

// Calcula um dígito verificador do CPF (pesos decrescentes, resto da divisão por 11)
function calcularDigito(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

// Recebe o CPF só com números (11 dígitos) e confere o formato e os dois dígitos verificadores
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;

  // 000.000.000-00, 111.111.111-11 etc. passam na conta, mas não existem
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);

  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}