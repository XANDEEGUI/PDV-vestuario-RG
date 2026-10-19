/**
 * Utilitários de formatação e máscaras para CPF e Telefone
 */

export function formatarCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarTelefone(tel: string | null | undefined): string {
  if (!tel) return '—';
  const limpo = tel.replace(/\D/g, '');
  if (limpo.length === 11) {
    return limpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (limpo.length === 10) {
    return limpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return tel;
}

export function aplicarMascaraCpf(valor: string): string {
  const limpo = valor.replace(/\D/g, '').slice(0, 11);
  return limpo
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function aplicarMascaraTelefone(valor: string): string {
  const limpo = valor.replace(/\D/g, '').slice(0, 11);
  if (limpo.length > 10) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (limpo.length > 5) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  if (limpo.length > 2) {
    return limpo.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  }
  return limpo;
}

