import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UsuarioModel } from '../models/UsuarioModel';
import { AuthRequest } from '../middlewares/auth';

export class LoginController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, senha } = req.body ?? {};

      if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
        res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
        return;
      }

      const emailNormalizado = email.trim().toLowerCase();
      const usuario = await UsuarioModel.buscarPorEmail(emailNormalizado);

      // Resposta genérica para evitar enumeração de usuários (usuário inexistente ou inativo)
      if (!usuario) {
        res.status(401).json({ erro: 'Credenciais inválidas.' });
        return;
      }

      const senhaValida = await bcryptjs.compare(senha, usuario.senha_hash);
      if (!senhaValida) {
        res.status(401).json({ erro: 'Credenciais inválidas.' });
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({ erro: 'Chave secreta JWT não configurada no servidor.' });
        return;
      }

      const token = jwt.sign(
        {
          id_usuario: usuario.id_usuario,
          nome: usuario.nome,
          cargo: usuario.cargo,
        },
        secret,
        { expiresIn: '8h' }
      );

      res.status(200).json({
        token,
        usuario: {
          id_usuario: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
        },
      });
    } catch (error) {
      console.error('Erro no processamento do login:', error);
      res.status(500).json({ erro: 'Erro interno do servidor ao processar o login.' });
    }
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idUsuario = req.usuario?.id_usuario ?? req.usuario?.id;

      if (!idUsuario) {
        res.status(401).json({ erro: 'Usuário não autenticado.' });
        return;
      }

      const usuario = await UsuarioModel.buscarPorId(idUsuario);

      if (!usuario) {
        res.status(404).json({ erro: 'Usuário não encontrado ou inativo.' });
        return;
      }

      res.status(200).json({
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
      });
    } catch (error) {
      console.error('Erro ao consultar dados do usuário autenticado:', error);
      res.status(500).json({ erro: 'Erro interno do servidor ao obter dados do usuário.' });
    }
  }
}
