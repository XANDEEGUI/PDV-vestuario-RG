import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ClienteModel, ClienteDados } from '../models/ClienteModel';
import { cpfValido, somenteDigitos } from '../utils/cpf';

interface EntradaCliente {
  nome?: unknown;
  cpf?: unknown;
  telefone?: unknown;
}

interface ResultadoValidacao {
  erro?: string;
  dados?: ClienteDados;
}

function textoOuNulo(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

function idValido(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validar(entrada: EntradaCliente): ResultadoValidacao {
  const nome = textoOuNulo(entrada.nome);
  if (!nome) {
    return { erro: 'O nome do cliente é obrigatório.' };
  }
  if (nome.length > 100) {
    return { erro: 'O nome deve ter no máximo 100 caracteres.' };
  }

  let cpf: string | null = null;
  const cpfInformado = textoOuNulo(entrada.cpf);
  if (cpfInformado) {
    cpf = somenteDigitos(cpfInformado);
    if (!cpfValido(cpf)) {
      return { erro: 'CPF inválido.' };
    }
  }

  const telefone = textoOuNulo(entrada.telefone);
  if (telefone) {
    if (telefone.length > 20) {
      return { erro: 'O telefone deve ter no máximo 20 caracteres.' };
    }
    const quantidadeDigitos = somenteDigitos(telefone).length;
    if (quantidadeDigitos < 10 || quantidadeDigitos > 13) {
      return { erro: 'Telefone inválido. Informe o DDD e o número.' };
    }
  }

  return { dados: { nome, cpf, telefone } };
}

function responderErro(error: unknown, res: Response, acao: string): void {
  const codigo =
    typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;

  if (codigo === 'ER_DUP_ENTRY') {
    res.status(400).json({ erro: 'CPF já cadastrado' });
    return;
  }

  console.error(`Erro ao ${acao}:`, error);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

export class ClienteController {
  static async listar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : undefined;
      const clientes = await ClienteModel.listar(busca);
      res.status(200).json(clientes);
    } catch (error) {
      responderErro(error, res, 'listar clientes');
    }
  }

  static async obter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const cliente = await ClienteModel.buscarPorId(id);
      if (!cliente) {
        res.status(404).json({ erro: 'Cliente não encontrado.' });
        return;
      }

      res.status(200).json(cliente);
    } catch (error) {
      responderErro(error, res, 'buscar cliente');
    }
  }

  static async criar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const resultado = validar(req.body ?? {});
      if (resultado.erro || !resultado.dados) {
        res.status(400).json({ erro: resultado.erro });
        return;
      }
      const dados = resultado.dados;

      // Validação: Verificar se o CPF informado já existe no banco
      if (dados.cpf) {
        const clienteExistente = await ClienteModel.buscarPorCpf(dados.cpf);
        if (clienteExistente) {
          res.status(400).json({ erro: 'CPF já cadastrado' });
          return;
        }
      }

      const id = await ClienteModel.criar(dados);
      const cliente = await ClienteModel.buscarPorId(id);

      res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso.', cliente });
    } catch (error) {
      responderErro(error, res, 'cadastrar cliente');
    }
  }

  static async atualizar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const existente = await ClienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ erro: 'Cliente não encontrado.' });
        return;
      }

      const corpo: EntradaCliente = req.body ?? {};
      const resultado = validar({
        nome: corpo.nome !== undefined ? corpo.nome : existente.nome,
        cpf: corpo.cpf !== undefined ? corpo.cpf : existente.cpf,
        telefone: corpo.telefone !== undefined ? corpo.telefone : existente.telefone,
      });

      if (resultado.erro || !resultado.dados) {
        res.status(400).json({ erro: resultado.erro });
        return;
      }
      const dados = resultado.dados;

      if (dados.cpf) {
        const clienteComCpf = await ClienteModel.buscarPorCpf(dados.cpf);
        if (clienteComCpf && clienteComCpf.id_cliente !== id) {
          res.status(400).json({ erro: 'CPF já cadastrado' });
          return;
        }
      }

      await ClienteModel.atualizar(id, dados);
      const clienteAtualizado = await ClienteModel.buscarPorId(id);

      res.status(200).json({ mensagem: 'Cliente atualizado com sucesso.', cliente: clienteAtualizado });
    } catch (error) {
      responderErro(error, res, 'atualizar cliente');
    }
  }

  static async excluir(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const existente = await ClienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ erro: 'Cliente não encontrado.' });
        return;
      }

      await ClienteModel.excluir(id);
      res.status(200).json({ mensagem: 'Cliente excluído com sucesso.' });
    } catch (error) {
      responderErro(error, res, 'excluir cliente');
    }
  }
}