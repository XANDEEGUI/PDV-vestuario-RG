import { Request, Response } from 'express';
import { CategoriaModel } from '../models/CategoriaModel';

export class CategoriaController {
  static async listar(_req: Request, res: Response): Promise<void> {
    try {
      const categorias = await CategoriaModel.listar();
      res.status(200).json(categorias);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ erro: 'Erro interno ao listar categorias.' });
    }
  }

  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, descricao } = req.body ?? {};

      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
        return;
      }

      const existente = await CategoriaModel.buscarPorNome(nome.trim());
      if (existente) {
        res.status(409).json({ erro: 'Já existe uma categoria cadastrada com este nome.' });
        return;
      }

      const id = await CategoriaModel.criar({ nome: nome.trim(), descricao });
      const nova = await CategoriaModel.buscarPorId(id);

      res.status(201).json({
        mensagem: 'Categoria cadastrada com sucesso.',
        categoria: nova,
      });
    } catch (error) {
      console.error('Erro ao cadastrar categoria:', error);
      res.status(500).json({ erro: 'Erro interno ao cadastrar categoria.' });
    }
  }
}

