const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const SECRET_KEY = 'casa_do_pastel_dashboard_secret';
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

let products = [
    {
        id: 1,
        name: 'Pastel de Carne',
        price: 10.9,
        stock: null,
        category: 'Tradicionais',
        description: 'Carne moida temperada, azeitona e massa crocante.',
        visible: true,
        hasAddons: true,
        image: ''
    },
    {
        id: 2,
        name: 'Combo Casal',
        price: 34.9,
        stock: null,
        category: 'Combos',
        description: 'Dois pasteis tradicionais e duas bebidas lata.',
        visible: true,
        hasAddons: true,
        image: ''
    }
];

let standardAddons = [
    { id: 1, name: 'Catupiry', price: 3 },
    { id: 2, name: 'Cheddar', price: 2.5 }
];

let deliverySettings = {
    neighborhoods: [
        { id: 1, name: 'Centro', fee: 5, active: true },
        { id: 2, name: 'Jardim Europa', fee: 7, active: true }
    ],
    payments: {
        pix: true,
        card: true,
        cash: true
    }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'casadopastel' && password === 'casadopastel2026') {
        const token = jwt.sign({ username, role: 'admin' }, SECRET_KEY);
        return res.json({ token, role: 'admin' });
    }

    res.status(401).json({ message: 'Credenciais invalidas' });
});

app.get('/api/products', authenticateToken, (req, res) => {
    res.json(products);
});

app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const newProduct = {
        id: Date.now(),
        ...req.body,
        price: Number(req.body.price || 0),
        stock: req.body.stock === undefined || req.body.stock === '' ? null : Number(req.body.stock),
        visible: req.body.visible !== 'false',
        hasAddons: req.body.hasAddons === 'true' || req.body.hasAddons === true,
        image: imageUrl
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    products = products.map((product) => {
        if (product.id == id) {
            return {
                ...product,
                ...req.body,
                price: Number(req.body.price ?? product.price),
                stock: req.body.stock === undefined || req.body.stock === '' ? product.stock : Number(req.body.stock),
                visible: req.body.visible === undefined ? product.visible : req.body.visible !== 'false',
                hasAddons: req.body.hasAddons === undefined ? product.hasAddons : req.body.hasAddons === 'true' || req.body.hasAddons === true,
                image: imageUrl || product.image
            };
        }

        return product;
    });

    res.json({ message: 'Produto atualizado' });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    products = products.filter((product) => product.id != id);
    res.json({ message: 'Produto excluido' });
});

app.get('/api/delivery', authenticateToken, (req, res) => {
    res.json(deliverySettings);
});

app.put('/api/delivery', authenticateToken, (req, res) => {
    deliverySettings = { ...deliverySettings, ...req.body };
    res.json(deliverySettings);
});

app.get('/api/addons', authenticateToken, (req, res) => {
    res.json(standardAddons);
});

app.put('/api/addons', authenticateToken, (req, res) => {
    standardAddons = Array.isArray(req.body) ? req.body : standardAddons;
    res.json(standardAddons);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
