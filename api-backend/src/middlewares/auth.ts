import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Cargo } from '../models/UsuarioModel';

export interface TokenPayload {
  id_usuario: number;
  nome: string;
  cargo: Cargo;
  id?: number; // Compatibilidade com código legado
}

export interface AuthRequest extends Request {
  usuario?: TokenPayload;
}

export function autenticar(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ erro: 'Token não fornecido ou em formato inválido.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ erro: 'Token não fornecido.' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ erro: 'Chave secreta JWT não configurada no servidor.' });
      return;
    }

    const payload = jwt.verify(token, secret) as TokenPayload;
    
    // Normalizar payload garantindo id_usuario e id
    req.usuario = {
      id_usuario: payload.id_usuario ?? (payload as unknown as { id: number }).id,
      nome: payload.nome,
      cargo: payload.cargo,
      id: payload.id_usuario ?? (payload as unknown as { id: number }).id,
    };

    next();
  } catch (error) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

export function autorizar(...cargosPermitidos: Cargo[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ erro: 'Usuário não autenticado.' });
      return;
    }

    if (!cargosPermitidos.includes(req.usuario.cargo)) {
      res.status(403).json({ erro: 'Acesso não autorizado para o perfil do usuário.' });
      return;
    }

    next();
  };
}
