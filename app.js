const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;

app.use(express.json()); // Necessário para que o req.body funcione corretamente
const cors = require('cors');
app.use(cors());




// Conectando ao banco de dados SQLite
const db = new sqlite3.Database('BD/bd_tarefasUser.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // Listar tabelas para verificação
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error("Erro ao listar tabelas:", err.message);
            } else {
                console.log("Tabelas no banco de dados:", tables);
            }
        });
    }
});

// Middleware para verificar se o token JWT é válido
const autenticarToken = (req, res, next) => {
    
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];

    
    if (!token) {
        console.log('Token não fornecido');
        return res.status(401).json({ message: 'Token não fornecido' });
    }

   
    jwt.verify(token, 'aChaveSecreta', (err, decoded) => {
        if (err) {
            console.log('Token inválido');
            return res.status(403).json({ message: 'Token inválido' });
        }

        // Armazena o ID do usuário decodificado na requisição
        req.usuarioId = decoded.userId;
        console.log('Token válido. ID do usuário:', req.usuarioId);
        // Chama o próximo middleware ou rota
        next();
    });
};


// Rota de login SQL direto
app.post('/login', (req, res) => {
    console.log('Requisição de Login:', req.body);
    const { email, senha } = req.body;  // Captura o email e senha do corpo da requisição

    const query = 'SELECT * FROM usuarios WHERE email = ?';
    db.get(query, [email], (err, usuario) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!usuario) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        // Verifica se a senha está correta
        if (senha !== usuario.senha) {
            return res.status(401).json({ message: 'Senha incorreta' });
        }

        // Gera o token JWT
        const token = jwt.sign({ userId: usuario.id }, 'aChaveSecreta', { expiresIn: '1h' });
        return res.json({ token });
    });
});

// INICIANDO ROTAS

// Rota GET para buscar todos os usuários 
app.get('/tarefas', autenticarToken, async (req, res) => { // Protegendo com autenticarToken
    try {
        const tarefas = await db.Tarefa.findAll();
        return res.json({ message: 'Sucesso', data: tarefas });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Adicionar novo usuário
app.post('/usuarios', (req, res) => {
    const { nome, cpf, email, senha } = req.body;
    const query = 'INSERT INTO usuarios (nome, cpf, email, senha) VALUES (?, ?, ?, ?)';
    db.run(query, [nome, cpf, email, senha], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(201).json({ id: this.lastID });
    });
});

// Alterar dados de usuário
app.put('/usuarios/:id', autenticarToken, (req, res) => { // Protegendo com autenticarToken
    const { id } = req.params; // Captura o ID dos parâmetros da URL
    const { nome, cpf, email, senha } = req.body; // Captura os dados do corpo da requisição

    const query = `
        UPDATE usuarios
        SET nome = ?, cpf = ?, email = ?, senha = ?
        WHERE id = ?
    `;

    db.run(query, [nome, cpf, email, senha, id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        return res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    });
});

// Deletar um usuário pelo ID
app.delete('/usuarios/:id', autenticarToken, (req, res) => { // Protegendo com autenticarToken
    const { id } = req.params;

    const query = 'DELETE FROM usuarios WHERE id = ?';

    db.run(query, id, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        return res.status(200).json({ message: 'Usuário deletado com sucesso' });
    });
});

// TAREFAS

// Rota para criar uma nova tarefa (protegida)
app.post('/tarefas', autenticarToken, (req, res) => {
    const { titulo, descricao, concluida } = req.body;
    const usuario_id = req.usuarioId; // Pega o ID do usuário a partir do token decodificado

    const query = 'INSERT INTO tarefas (titulo, descricao, concluida, usuario_id) VALUES (?, ?, ?, ?)';
    db.run(query, [titulo, descricao, concluida || false, usuario_id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(201).json({ id: this.lastID });
    });
});

// Rota para buscar todas as tarefas de um usuário específico (protegida)
app.get('/usuarios/:id/tarefas', autenticarToken, (req, res) => {
    const { id } = req.params;

    // Verifica se o usuário logado está tentando acessar as suas próprias tarefas
    if (req.usuarioId !== parseInt(id)) {
        return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const query = 'SELECT * FROM tarefas WHERE usuario_id = ?';
    db.all(query, [id], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        return res.json({
            message: 'Sucesso',
            data: rows
        });
    });
});

// Rota para atualizar uma tarefa existente (protegida)
// Rota para atualizar uma tarefa existente (protegida)
app.put('/tarefas/:id', autenticarToken, (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, concluida } = req.body;
    const usuario_id = req.usuarioId; // Pega o ID do usuário logado a partir do token

    const query = `
        UPDATE tarefas
        SET titulo = ?, descricao = ?, concluida = ?
        WHERE id = ? AND usuario_id = ?
    `;

    db.run(query, [titulo, descricao, concluida, id, usuario_id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Tarefa não encontrada ou não pertence a este usuário' });
        }
        return res.status(200).json({ message: 'Tarefa atualizada com sucesso' });
    });
});

// Rota para deletar uma tarefa existente (protegida)
app.delete('/tarefas/:id', autenticarToken, (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuarioId; // Pega o ID do usuário logado a partir do token

    const query = 'DELETE FROM tarefas WHERE id = ? AND usuario_id = ?';

    db.run(query, [id, usuario_id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Tarefa não encontrada ou não pertence a este usuário' });
        }
        return res.status(200).json({ message: 'Tarefa deletada com sucesso' });
    });
});

// Rota para buscar uma tarefa específica pelo ID (protegida)
app.get('/tarefas/:id', autenticarToken, (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuarioId; // Pega o ID do usuário logado a partir do token

    const query = 'SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?';

    db.get(query, [id, usuario_id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: 'Tarefa não encontrada ou não pertence a este usuário' });
        }
        return res.json({
            message: 'Sucesso',
            data: row
        });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

// Fechar a conexão com o banco de dados quando o processo for encerrado
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar o banco de dados:', err.message);
        }
        console.log('Conexão com o banco de dados SQLite fechada.');
        process.exit(0);
    });
});


 