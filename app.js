import { db } from "./firebase.js";
import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    adicionarProduto, 
    atualizarStatusProduto, 
    uploadImagem,
    salvarCategorias, 
    excluirCategoria, 
    salvarAdicional,
    excluirAdicional,
    salvarBairro,
    excluirBairro,
    atualizarConfiguracoes, 
    ouvirPedidos 
} from "./firebase-service.js";

console.log('Instância do DB:', db);

const fallbackImage = 'img/logo.png';

const defaultCategories = [
    { id: 'tradicionais', name: 'Tradicionais', order: 1, active: true },
    { id: 'especiais', name: 'Especiais', order: 2, active: true },
    { id: 'doces', name: 'Doces', order: 3, active: true },
    { id: 'combos', name: 'Combos', order: 4, active: true },
    { id: 'bebidas', name: 'Bebidas', order: 5, active: true }
];

const defaultProducts = [
    {
        id: 'prod-carne',
        name: 'Pastel de Carne',
        description: 'Carne moida temperada, azeitona e massa crocante.',
        category: 'Tradicionais',
        price: 10.9,
        stock: null,
        visible: true,
        hasAddons: true,
        image: fallbackImage,
        addons: [{ name: 'Catupiry', price: 3 }, { name: 'Cheddar', price: 2.5 }]
    },
    {
        id: 'prod-queijo',
        name: 'Pastel de Queijo',
        description: 'Mussarela cremosa com massa sequinha.',
        category: 'Tradicionais',
        price: 10.5,
        stock: null,
        visible: true,
        hasAddons: true,
        image: fallbackImage,
        addons: [{ name: 'Tomate', price: 1.5 }, { name: 'Oregano', price: 0 }]
    },
    {
        id: 'prod-camarao',
        name: 'Pastel de Camarao',
        description: 'Camarao refogado com tempero da casa.',
        category: 'Especiais',
        price: 18.9,
        stock: null,
        visible: true,
        hasAddons: true,
        image: fallbackImage,
        addons: [{ name: 'Catupiry', price: 3.5 }]
    },
    {
        id: 'prod-banana',
        name: 'Pastel de Banana com Canela',
        description: 'Banana, acucar e canela finalizados na hora.',
        category: 'Doces',
        price: 12.9,
        stock: null,
        visible: true,
        hasAddons: true,
        image: fallbackImage,
        addons: [{ name: 'Leite condensado', price: 2.5 }]
    },
    {
        id: 'prod-combo-casal',
        name: 'Combo Casal',
        description: 'Dois pasteis tradicionais e duas bebidas lata.',
        category: 'Combos',
        price: 34.9,
        stock: null,
        visible: true,
        hasAddons: true,
        image: fallbackImage,
        addons: [{ name: 'Trocar por especial', price: 6 }]
    },
    {
        id: 'prod-refri',
        name: 'Refrigerante Lata',
        description: 'Bebida gelada em lata 350ml.',
        category: 'Bebidas',
        price: 6.5,
        stock: 60,
        visible: true,
        hasAddons: false,
        image: fallbackImage,
        addons: []
    }
];

const defaultAddons = [
    { id: 'addon-catupiry', name: 'Catupiry', price: 3 },
    { id: 'addon-cheddar', name: 'Cheddar', price: 2.5 },
    { id: 'addon-tomate', name: 'Tomate', price: 1.5 }
];

const defaultDelivery = {
    neighborhoods: [
        { id: 'bairro-centro', name: 'Centro', fee: 5, active: true },
        { id: 'bairro-jardim', name: 'Jardim Europa', fee: 7, active: true },
        { id: 'bairro-vila', name: 'Vila Nova', fee: 8.5, active: true }
    ],
    payments: {
        pix: true,
        card: true,
        cash: true
    }
};

const today = new Date();

const defaultOrders = [
    makeOrder(0, 'Pix', 6, '11:18', [
        { productId: 'prod-carne', name: 'Pastel de Carne', quantity: 3, unitPrice: 10.9 },
        { productId: 'prod-refri', name: 'Refrigerante Lata', quantity: 2, unitPrice: 6.5 }
    ]),
    makeOrder(0, 'Cartao', 5, '14:42', [
        { productId: 'prod-combo-casal', name: 'Combo Casal', quantity: 1, unitPrice: 34.9 }
    ]),
    makeOrder(1, 'Dinheiro', 7, '20:05', [
        { productId: 'prod-queijo', name: 'Pastel de Queijo', quantity: 2, unitPrice: 10.5 },
        { productId: 'prod-banana', name: 'Pastel de Banana com Canela', quantity: 1, unitPrice: 12.9 }
    ]),
    makeOrder(3, 'Pix', 6, '19:33', [
        { productId: 'prod-camarao', name: 'Pastel de Camarao', quantity: 2, unitPrice: 18.9 }
    ]),
    makeOrder(6, 'Cartao', 8.5, '18:57', [
        { productId: 'prod-carne', name: 'Pastel de Carne', quantity: 4, unitPrice: 10.9 },
        { productId: 'prod-refri', name: 'Refrigerante Lata', quantity: 4, unitPrice: 6.5 }
    ]),
    makeOrder(13, 'Pix', 5, '12:21', [
        { productId: 'prod-queijo', name: 'Pastel de Queijo', quantity: 3, unitPrice: 10.5 }
    ])
];

let categories = [];
let products = [];
let delivery = { ...defaultDelivery };
let orders = [];
let standardAddons = [...defaultAddons];
let currentView = 'menuView';
let editingImage = fallbackImage;

const elements = {
    viewTitle: document.getElementById('viewTitle'),
    stockSummary: document.getElementById('stockSummary'),
    assistantForm: document.getElementById('assistantForm'),
    assistantCommand: document.getElementById('assistantCommand'),
    assistantResponse: document.getElementById('assistantResponse'),
    searchProduct: document.getElementById('searchProduct'),
    btnOpenModal: document.getElementById('btnOpenModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelProduct: document.getElementById('btnCancelProduct'),
    productModal: document.getElementById('productModal'),
    productForm: document.getElementById('productForm'),
    productTableBody: document.getElementById('productTableBody'),
    productCategory: document.getElementById('productCategory'),
    categoryForm: document.getElementById('categoryForm'),
    categoryName: document.getElementById('categoryName'),
    categoryList: document.getElementById('categoryList'),
    globalAddonForm: document.getElementById('globalAddonForm'),
    globalAddonList: document.getElementById('globalAddonList'),
    addonCount: document.getElementById('addonCount'),
    categoryCount: document.getElementById('categoryCount'),
    productCount: document.getElementById('productCount'),
    paymentForm: document.getElementById('paymentForm'),
    neighborhoodForm: document.getElementById('neighborhoodForm'),
    neighborhoodTableBody: document.getElementById('neighborhoodTableBody'),
    neighborhoodCount: document.getElementById('neighborhoodCount'),
    paymentSummary: document.getElementById('paymentSummary'),
    dailyRevenue: document.getElementById('dailyRevenue'),
    dailyOrders: document.getElementById('dailyOrders'),
    weeklyRevenue: document.getElementById('weeklyRevenue'),
    weeklyOrders: document.getElementById('weeklyOrders'),
    monthlyRevenue: document.getElementById('monthlyRevenue'),
    monthlyOrders: document.getElementById('monthlyOrders'),
    topProductsList: document.getElementById('topProductsList'),
    ordersTableBody: document.getElementById('ordersTableBody'),
    ordersCount: document.getElementById('ordersCount'),
    salesChart: document.getElementById('salesChart'),
    stockGroup: document.getElementById('stockGroup'),
    productHasAddons: document.getElementById('productHasAddons'),
    addonsEditor: document.getElementById('addonsEditor'),
    addonName: document.getElementById('addonName'),
    addonPrice: document.getElementById('addonPrice'),
    btnAddAddon: document.getElementById('btnAddAddon')
};
let ordersVisibleCount = 0;

let pickerRange = {
    start: new Date(new Date().setDate(new Date().getDate() - 6)),
    end: new Date()
};
let pickerMonthOffset = 0;


document.querySelectorAll('[data-view-target]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.viewTarget));
});

document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    window.location.href = 'login.html';
});

elements.btnOpenModal.addEventListener('click', () => openProductModal());
elements.btnCloseModal.addEventListener('click', closeProductModal);
elements.btnCancelProduct.addEventListener('click', closeProductModal);
elements.searchProduct.addEventListener('input', renderProducts);
elements.productForm.addEventListener('submit', saveProductFromForm);
elements.categoryForm.addEventListener('submit', addCategory);
elements.categoryList.addEventListener('click', handleCategoryAction);
elements.productTableBody.addEventListener('click', handleProductAction);
elements.productCategory.addEventListener('change', syncStockFieldVisibility);
document.getElementById('productName').addEventListener('input', syncStockFieldVisibility);
elements.globalAddonForm?.addEventListener('submit', addGlobalAddon);
elements.globalAddonList?.addEventListener('click', handleGlobalAddonAction);
elements.paymentForm.addEventListener('submit', savePaymentSettings);
elements.neighborhoodForm.addEventListener('submit', addNeighborhood);
elements.neighborhoodTableBody.addEventListener('click', handleNeighborhoodAction);
elements.assistantForm.addEventListener('submit', handleAssistantCommand);
elements.btnAddAddon.addEventListener('click', addAddonFromInputs);
elements.addonsEditor.addEventListener('click', handleAddonEditorAction);
document.getElementById('btnExpandOrders')?.addEventListener('click', handleExpandOrders);

document.getElementById('btnOpenDatePicker')?.addEventListener('click', openDatePicker);
document.getElementById('cancelDatePicker')?.addEventListener('click', closeDatePicker);
document.getElementById('applyDatePicker')?.addEventListener('click', applyDateRange);
document.getElementById('datePickerPresets')?.addEventListener('click', handlePresetClick);
document.getElementById('datePickerCalendars')?.addEventListener('click', handleDateClick);

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

document.getElementById('btnMobileMenu')?.addEventListener('click', toggleSidebar);
document.getElementById('btnCloseSidebar')?.addEventListener('click', toggleSidebar);

// --- FIREBASE INTEGRATION ---
function initFirebase() {
    // Categorias
    onSnapshot(collection(db, "categorias"), (snapshot) => {
        categories = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.nome || "", // Mapeia 'nome' do banco para 'name' do código
                order: data.ordem || 0, // Mapeia 'ordem' do banco para 'order' do código
                active: data.ativo !== undefined ? data.ativo : true
            };
        });
        renderCategoryOptions();
        renderCategories();
    });

    // Adicionais Globais
    onSnapshot(collection(db, "adicionais"), (snapshot) => {
        standardAddons = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.nome || "",
                price: data.preco || 0,
                active: data.ativo !== false
            };
        });
        renderGlobalAddons();
    });

    // Produtos
    onSnapshot(collection(db, "produtos"), (snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
        renderGlobalSummary();
    });

    // Bairros (Nova Coleção Independente)
    onSnapshot(collection(db, "bairros"), (snapshot) => {
        delivery.neighborhoods = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.nome || "",
                fee: data.taxa || 0,
                active: data.ativo !== false
            };
        });
        renderDelivery();
    });

    // Configurações (Apenas Pagamento agora)
    onSnapshot(doc(db, "configuracoes", "geral"), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            delivery.payments = data.pagamentos || delivery.payments;
            renderDelivery();
        }
    });

    // Pedidos
    ouvirPedidos((novosPedidos) => {
        orders = novosPedidos;
        renderFinance();
    });
}

initFirebase();
renderAll();

function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
}

function renderAll() {
    renderCategoryOptions();
    renderCategories();
    renderProducts();
    renderDelivery();
    renderFinance();
    renderGlobalSummary();
}

function switchView(viewId) {
    currentView = viewId;

    document.querySelectorAll('.view').forEach((view) => {
        view.classList.toggle('active', view.id === viewId);
    });

    document.querySelectorAll('[data-view-target]').forEach((button) => {
        button.classList.toggle('active', button.dataset.viewTarget === viewId);
    });

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    const titles = {
        menuView: 'Gestao do Cardapio',
        deliveryView: 'Entrega e Pagamento',
        financeView: 'Dashboard Financeiro'
    };

    elements.viewTitle.textContent = titles[viewId];

    if (viewId === 'financeView') {
        renderFinance();
    }
}

function renderGlobalSummary() {
    const activeProducts = products.filter(isProductAvailable).length;
    elements.stockSummary.textContent = `${activeProducts} itens ativos`;
}

function renderCategoryOptions() {
    const options = getSortedCategories()
        .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`)
        .join('');

    elements.productCategory.innerHTML = options;
}

function renderCategories() {
    const sortedCategories = getSortedCategories();
    elements.categoryCount.textContent = `${sortedCategories.length} categorias`;

    elements.categoryList.innerHTML = sortedCategories.map((category, index) => {
        const productTotal = products.filter((product) => product.category === category.name).length;
        return `
            <div class="category-item" data-id="${category.id}">
                <div class="category-meta">
                    <strong>${index + 1}</strong>
                    <span>${escapeHtml(category.name)}</span>
                    <small>${productTotal} produtos</small>
                </div>
                <div class="row-actions">
                    <button type="button" class="icon-button" data-category-action="edit" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="icon-button" data-category-action="up" title="Subir" ${index === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button type="button" class="icon-button" data-category-action="down" title="Descer" ${index === sortedCategories.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button type="button" class="icon-button danger" data-category-action="delete" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderGlobalAddons() {
    if (!elements.globalAddonList) return;
    elements.addonCount.textContent = `${standardAddons.length} itens`;

    elements.globalAddonList.innerHTML = standardAddons.map((addon) => `
        <div class="category-item" data-id="${addon.id}">
            <div class="category-meta">
                <strong style="background: var(--green); color: white;"><i class="fas fa-plus" style="font-size: 0.7rem;"></i></strong>
                <span>${escapeHtml(addon.name)}</span>
                <small>${formatCurrency(addon.price)}</small>
            </div>
            <div class="row-actions">
                <button type="button" class="icon-button danger" data-addon-global-action="delete" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function addGlobalAddon(event) {
    event.preventDefault();
    const nameInput = document.getElementById('globalAddonName');
    const priceInput = document.getElementById('globalAddonPrice');
    
    const nome = nameInput.value.trim();
    const preco = toNumber(priceInput.value);

    if (!nome) return;

    try {
        await salvarAdicional({ nome, preco, ativo: true });
        nameInput.value = '';
        priceInput.value = '';
        showAssistantResponse(`Adicional "${nome}" cadastrado com sucesso.`);
    } catch (error) {
        alert("Erro ao salvar adicional global.");
    }
}

async function handleGlobalAddonAction(event) {
    const button = event.target.closest('[data-addon-global-action]');
    if (!button) return;

    const id = button.closest('.category-item')?.dataset.id;
    if (button.dataset.addonGlobalAction === 'delete' && confirm("Remover este adicional da lista global?")) {
        await excluirAdicional(id);
        showAssistantResponse("Adicional removido da base de dados.");
    }
}

function renderProducts() {
    const term = elements.searchProduct.value.trim().toLowerCase();
    const filteredProducts = getSortedProducts().filter((product) => {
        const content = `${product.name} ${product.category} ${product.description}`.toLowerCase();
        return content.includes(term);
    });

    elements.productCount.textContent = `${filteredProducts.length} produtos`;

    if (!filteredProducts.length) {
        elements.productTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">Nenhum produto encontrado.</td>
            </tr>
        `;
        return;
    }

    elements.productTableBody.innerHTML = filteredProducts.map((product) => {
        const available = isProductAvailable(product);
        const stockControlled = tracksStock(product);
        const optionalCount = product.hasAddons ? standardAddons.length : 0;
        const stockText = stockControlled ? `${Number(product.stock || 0)} un` : 'Nao controlado';
        const statusClass = available ? 'success' : 'muted';
        const statusText = available ? 'Ativo' : stockControlled && Number(product.stock || 0) <= 0 ? 'Sem estoque' : 'Oculto';

        return `
            <tr data-id="${product.id}">
                <td data-label="Imagem"><img src="${escapeAttribute(product.image || fallbackImage)}" alt="${escapeAttribute(product.name)}" class="product-img"></td>
                <td data-label="Produto">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span class="product-details">${escapeHtml(product.description || 'Sem descricao')}</span>
                </td>
                <td data-label="Categoria"><span class="badge">${escapeHtml(product.category)}</span></td>
                <td data-label="Preco">${formatCurrency(product.price)}</td>
                <td data-label="Adicionais">${optionalCount ? `${optionalCount} padrao` : 'Sem adicionais'}</td>
                <td data-label="Estoque">${stockText}</td>
                <td data-label="Status"><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td data-label="Acoes">
                    <div class="row-actions">
                        <button type="button" class="icon-button" data-product-action="toggle" title="${product.status === 'ativo' ? 'Ocultar' : 'Ativar'}">
                            <i class="fas ${product.status === 'ativo' ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button type="button" class="icon-button" data-product-action="edit" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button type="button" class="icon-button danger" data-product-action="delete" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDelivery() {
    document.getElementById('payPix').checked = delivery.payments.pix;
    document.getElementById('payCard').checked = delivery.payments.card;
    document.getElementById('payCash').checked = delivery.payments.cash;

    const activePayments = getActivePayments();
    elements.paymentSummary.textContent = `${activePayments.length} ativos`;
    elements.neighborhoodCount.textContent = `${delivery.neighborhoods.length} bairros`;

    if (!delivery.neighborhoods.length) {
        elements.neighborhoodTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">Nenhum bairro cadastrado.</td>
            </tr>
        `;
    } else {
        elements.neighborhoodTableBody.innerHTML = delivery.neighborhoods.map((neighborhood) => `
        <tr data-id="${neighborhood.id}">
            <td data-label="Bairro">${escapeHtml(neighborhood.name)}</td>
            <td data-label="Taxa">${formatCurrency(neighborhood.fee)}</td>
            <td data-label="Status"><span class="status-pill ${neighborhood.active ? 'success' : 'muted'}">${neighborhood.active ? 'Ativo' : 'Inativo'}</span></td>
            <td data-label="Acoes">
                <div class="row-actions">
                    <button type="button" class="icon-button" data-neighborhood-action="toggle" title="${neighborhood.active ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${neighborhood.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button type="button" class="icon-button danger" data-neighborhood-action="delete" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `).join('');
    }
}

function renderFinance() {
    const summary = getFinanceSummary();
    elements.dailyRevenue.textContent = formatCurrency(summary.daily.total);
    elements.dailyOrders.textContent = `${summary.daily.count} pedidos`;
    elements.weeklyRevenue.textContent = formatCurrency(summary.weekly.total);
    elements.weeklyOrders.textContent = `${summary.weekly.count} pedidos`;
    elements.monthlyRevenue.textContent = formatCurrency(summary.monthly.total);
    elements.monthlyOrders.textContent = `${summary.monthly.count} pedidos`;
    elements.ordersCount.textContent = `${orders.length} pedidos`;

    renderTopProducts(summary.ranking);
    renderOrders();
    renderSalesChart();
}

function renderTopProducts(ranking) {
    if (!ranking.length) {
        elements.topProductsList.innerHTML = '<p class="empty-state">Sem vendas registradas.</p>';
        return;
    }

    elements.topProductsList.innerHTML = ranking.slice(0, 5).map((item, index) => `
        <div class="ranking-item">
            <strong>${index + 1}</strong>
            <div>
                <span>${escapeHtml(item.name)}</span>
                <small>${item.quantity} un vendidas</small>
            </div>
            <b>${formatCurrency(item.revenue)}</b>
        </div>
    `).join('');
}

function renderOrders() {
    const isMobile = window.innerWidth <= 768;
    const defaultLimit = isMobile ? 3 : 5;

    // Se for a primeira renderização ou reset, aplica o limite responsivo
    if (ordersVisibleCount === 0) {
        ordersVisibleCount = defaultLimit;
    }

    const sortedOrders = [...orders]
        .filter(order => {
            const d = new Date(`${order.date}T00:00:00`);
            return d >= startOfDay(pickerRange.start) && d <= startOfDay(pickerRange.end);
        })
        .sort((a, b) => {
            return new Date(`${b.date}T${b.time || '00:00'}:00`) - new Date(`${a.date}T${a.time || '00:00'}:00`);
        });

    const ordersToRender = sortedOrders.slice(0, ordersVisibleCount);
    const btnExpand = document.getElementById('btnExpandOrders');
    const expansionContainer = document.getElementById('ordersExpansionContainer');

    // Controle do botão de expansão
    if (ordersVisibleCount >= sortedOrders.length) {
        expansionContainer.style.display = 'none';
    } else {
        expansionContainer.style.display = 'flex';
        if (sortedOrders.length > 20) {
            btnExpand.innerHTML = '<i class="fas fa-plus-circle"></i> Carregar Mais';
        } else {
            btnExpand.innerHTML = '<i class="fas fa-history"></i> Ver Histórico Completo';
        }
    }

    elements.ordersTableBody.innerHTML = ordersToRender.map((order) => {
        const items = order.items
            .map((item) => `${item.quantity}x ${escapeHtml(item.name)}`)
            .join(', ');

        return `
            <tr>
                <td data-label="Data">${formatDate(order.date)}</td>
                <td data-label="Hora">${escapeHtml(order.time || '12:00')}</td>
                <td data-label="Itens">${items}</td>
                <td data-label="Pagamento">${escapeHtml(order.paymentMethod)}</td>
                <td data-label="Taxa">${formatCurrency(order.deliveryFee)}</td>
                <td data-label="Total">${formatCurrency(getOrderTotal(order))}</td>
            </tr>
        `;
    }).join('');
}

function handleExpandOrders() {
    const filteredCount = orders.filter(order => {
        const d = new Date(`${order.date}T00:00:00`);
        return d >= startOfDay(pickerRange.start) && d <= startOfDay(pickerRange.end);
    }).length;

    // Se tiver muitos pedidos, carrega de 20 em 20, senão mostra tudo
    if (filteredCount > 20) ordersVisibleCount += 20;
    else ordersVisibleCount = filteredCount;

    renderOrders();
}

function renderSalesChart() {
    const points = getSalesChartData();
    const maxTotal = Math.max(...points.map((point) => point.total), 1);
    
    // Otimização de UI baseada na densidade de pontos
    const isCrowded = points.length > 7;
    const pointRadius = isCrowded ? 1.5 : 5;

    const width = 720;
    const height = 280;
    const margin = { top: 32, right: 28, bottom: 48, left: 64 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const baseline = margin.top + chartHeight;
    const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
    const coordinates = points.map((point, index) => {
        const x = margin.left + index * xStep;
        const y = baseline - (point.total / maxTotal) * chartHeight;
        return { ...point, x, y };
    });
    const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${coordinates.at(-1).x.toFixed(1)} ${baseline} L ${coordinates[0].x.toFixed(1)} ${baseline} Z`;
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = baseline - ratio * chartHeight;
        const value = maxTotal * ratio;
        return `
            <g class="line-chart-grid">
                <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
                <text x="${margin.left - 12}" y="${y + 4}">${formatCompactCurrency(value)}</text>
            </g>
        `;
    }).join('');
    const labels = coordinates.map((point, index) => {
        // Exibe no máximo 7-8 legendas no eixo X pulando itens se necessário
        if (isCrowded && index % 2 !== 0 && points.length > 8) return '';
        return `<text class="line-chart-day" x="${point.x}" y="${height - 18}">${escapeHtml(point.label)}</text>`;
    }).join('');

    const markers = coordinates.map((point, index) => `
        <g class="line-chart-point" style="animation-delay: ${(0.55 + index * 0.12).toFixed(2)}s">
            <circle cx="${point.x}" cy="${point.y}" r="${pointRadius}">
                <title>${point.label}: ${formatCurrency(point.total)}</title>
            </circle>
            ${!isCrowded ? `<text x="${point.x}" y="${Math.max(point.y - 14, 16)}">${formatCompactCurrency(point.total)}</text>` : ''}
        </g>
    `).join('');

    elements.salesChart.innerHTML = `
        <svg class="line-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico de vendas dos ultimos sete dias">
            <defs>
                <linearGradient id="salesLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#18794e"></stop>
                    <stop offset="55%" stop-color="#f2c94c"></stop>
                    <stop offset="100%" stop-color="#b42318"></stop>
                </linearGradient>
                <linearGradient id="salesAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f2c94c" stop-opacity="0.42"></stop>
                    <stop offset="100%" stop-color="#f2c94c" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            ${gridLines}
            <path class="line-chart-area" d="${areaPath}"></path>
            <path class="line-chart-path" pathLength="1" d="${linePath}"></path>
            ${markers}
            ${labels}
        </svg>
    `;
}

function openProductModal(productId = null) {
    elements.productForm.reset();
    document.getElementById('productVisible').checked = true;
    elements.productHasAddons.checked = false;
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').textContent = 'Adicionar Produto';
    editingImage = fallbackImage;
    renderAddonEditor(standardAddons);
    syncStockFieldVisibility();

    if (productId) {
        const product = products.find((item) => item.id === productId);
        if (!product) return;

        document.getElementById('modalTitle').textContent = 'Editar Produto';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productDesc').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock ?? '';
        elements.productHasAddons.checked = product.hasAddons === true;
        document.getElementById('productVisible').checked = product.status === 'ativo';
        editingImage = product.image || fallbackImage;
        syncStockFieldVisibility(product);
    }

    elements.productModal.style.display = 'flex';
}

function closeProductModal() {
    elements.productModal.style.display = 'none';
}

async function saveProductFromForm(event) {
    event.preventDefault();
    console.log('Iniciando submissão do produto...');

    try {
        const id = document.getElementById('productId').value;
        const imageFile = document.getElementById('productImage').files[0];

        let imageUrl = editingImage;

        // Se o usuário selecionou uma nova imagem, faz o upload para o ImgBB primeiro
        if (imageFile) {
            showAssistantResponse("Fazendo upload da imagem...");
            imageUrl = await uploadImagem(imageFile);
        }

        const productData = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDesc').value.trim(),
            price: toNumber(document.getElementById('productPrice').value),
            hasAddons: elements.productHasAddons.checked,
            status: document.getElementById('productVisible').checked ? "ativo" : "oculto",
            image: imageUrl,
            addons: collectAddonEditorRows()
        };

        console.log('Tentando salvar produto:', productData);

        if (id) {
            console.log('Atualizando produto existente, ID:', id);
            await updateDoc(doc(db, "produtos", id), productData);
            showAssistantResponse(`Produto "${productData.name}" atualizado.`);
        } else {
            console.log('Adicionando novo produto...');
            await adicionarProduto(productData);
            showAssistantResponse(`Produto "${productData.name}" adicionado.`);
        }
        closeProductModal();
        console.log('Produto salvo com sucesso!');
    } catch (error) {
        console.error('Erro detalhado do Firebase (Salvar Produto):', error);
        alert('Erro ao salvar produto: ' + error.message);
    }
}

async function handleProductAction(event) {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;

    const row = button.closest('tr');
    const productId = row?.dataset.id;
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const action = button.dataset.productAction;

    if (action === 'edit') {
        openProductModal(productId);
        return;
    }

    if (action === 'toggle') {
        const novoStatus = product.status === 'ativo' ? 'oculto' : 'ativo';
        await atualizarStatusProduto(productId, novoStatus);
        showAssistantResponse(`${product.name} agora está ${novoStatus} no site.`);
        return;
    }

    if (action === 'delete' && confirm(`Excluir ${product.name}?`)) {
        await deleteDoc(doc(db, "produtos", productId));
        showAssistantResponse(`${product.name} foi removido do cardapio.`);
    }
}

async function addCategory(event) {
    event.preventDefault();
    console.log('Iniciando submissão de categoria...');

    try {
        const name = elements.categoryName.value.trim();
        if (!name) {
            console.warn('Nome da categoria está vazio.');
            return;
        }

        const alreadyExists = categories.some((category) => normalizeText(category.name) === normalizeText(name));
        if (alreadyExists) {
            alert('Ja existe uma categoria com esse nome.');
            return;
        }

        const newCategory = {
            name,
            order: categories.length + 1,
            active: true
        };

        console.log('Tentando salvar nova categoria:', newCategory);
        
        // Criamos uma lista atualizada para enviar ao Firestore
        const novaListaCategorias = [...categories, newCategory];
        await salvarCategorias(novaListaCategorias);

        elements.categoryName.value = '';
        showAssistantResponse(`Categoria "${name}" adicionada ao topo do site.`);
        console.log('Categoria salva com sucesso!');
    } catch (error) {
        console.error('Erro detalhado do Firebase (Adicionar Categoria):', error);
        alert('Erro ao salvar categoria: ' + error.message);
    }
}

async function handleCategoryAction(event) {
    const button = event.target.closest('[data-category-action]');
    if (!button) return;

    const categoryId = button.closest('.category-item')?.dataset.id;
    const action = button.dataset.categoryAction;
    const sorted = getSortedCategories();
    const currentIndex = sorted.findIndex((category) => category.id === categoryId);

    if (action === 'edit') {
        const category = sorted[currentIndex];
        if (!category) return;

        const newName = prompt('Novo nome da categoria:', category.name)?.trim();
        if (!newName || newName === category.name) return;

        const alreadyExists = categories.some((item) => item.id !== category.id && normalizeText(item.name) === normalizeText(newName));
        if (alreadyExists) {
            alert('Ja existe uma categoria com esse nome.');
            return;
        }

        const oldName = category.name;
        categories = categories.map((item) => (item.id === category.id ? { ...item, name: newName } : item));
        await salvarCategorias(categories);
        showAssistantResponse(`Categoria "${oldName}" renomeada para "${newName}".`);
        return;
    }

    if (action === 'delete') {
        const category = sorted[currentIndex];
        if (!category) return;

        if (sorted.length === 1) {
            alert('Mantenha pelo menos uma categoria no topo.');
            return;
        }

        const productTotal = products.filter((product) => product.category === category.name).length;
        const message = productTotal
            ? `Remover "${category.name}"? ${productTotal} produtos serao movidos para outra categoria.`
            : `Remover "${category.name}"?`;

        if (!confirm(message)) return;

        const fallbackCategory = sorted.find((item) => item.id !== category.id);

        // 1. Atualiza os produtos vinculados a esta categoria no banco de dados para a categoria reserva
        const productsToUpdate = products.filter(p => p.category === category.name);
        for (const p of productsToUpdate) {
            await updateDoc(doc(db, "produtos", p.id), { category: fallbackCategory.name });
        }

        // 2. Remove o documento da categoria permanentemente do Firestore
        await excluirCategoria(categoryId);

        // 3. Reordena as categorias restantes e salva a nova ordem
        categories = sorted
            .filter((item) => item.id !== category.id)
            .map((item, index) => ({ ...item, order: index + 1 }));
        await salvarCategorias(categories);
        showAssistantResponse(`Categoria "${category.name}" removida. Produtos movidos para "${fallbackCategory.name}".`);
        return;
    }

    const targetIndex = action === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;

    [sorted[currentIndex], sorted[targetIndex]] = [sorted[targetIndex], sorted[currentIndex]];
    categories = sorted.map((category, index) => ({ ...category, order: index + 1 }));
    await salvarCategorias(categories);
    showAssistantResponse(`Categoria "${sorted[targetIndex].name}" reposicionada no topo do site.`);
}

async function savePaymentSettings(event) {
    event.preventDefault();

    const payments = {
        pix: document.getElementById('payPix').checked,
        card: document.getElementById('payCard').checked,
        cash: document.getElementById('payCash').checked
    };

    await atualizarConfiguracoes(payments);
    showAssistantResponse(`Pagamentos ativos: ${getActivePayments().join(', ') || 'nenhum'}.`);
}

async function addNeighborhood(event) {
    event.preventDefault();

    const nameInput = document.getElementById('neighborhoodName');
    const feeInput = document.getElementById('neighborhoodFee');
    const name = nameInput.value.trim();
    const fee = toNumber(feeInput.value);

    if (!name) return;

    try {
        await salvarBairro({ nome: name, taxa: fee, ativo: true });
        nameInput.value = '';
        feeInput.value = '';
        showAssistantResponse(`Taxa de ${formatCurrency(fee)} definida para ${name}.`);
    } catch (error) {
        alert("Erro ao salvar bairro.");
    }
}

async function handleNeighborhoodAction(event) {
    const button = event.target.closest('[data-neighborhood-action]');
    if (!button) return;

    const row = button.closest('tr');
    const neighborhoodId = row?.dataset.id;
    const neighborhood = delivery.neighborhoods.find((item) => item.id === neighborhoodId);
    if (!neighborhood) return;

    const action = button.dataset.neighborhoodAction;

    if (action === 'toggle') {
        await salvarBairro({ 
            id: neighborhoodId, 
            nome: neighborhood.name, 
            taxa: neighborhood.fee, 
            ativo: !neighborhood.active 
        });
        showAssistantResponse(`${neighborhood.name} agora está ${!neighborhood.active ? 'ativo' : 'inativo'}.`);
    }

    if (action === 'delete' && confirm(`Excluir taxa de ${neighborhood.name}?`)) {
        await excluirBairro(neighborhoodId);
        showAssistantResponse(`Taxa de ${neighborhood.name} removida.`);
    }
}

function handleAssistantCommand(event) {
    event.preventDefault();

    const command = elements.assistantCommand.value.trim();
    if (!command) return;

    const response = processCommand(command);
    showAssistantResponse(response);
    elements.assistantCommand.value = '';
}

function processCommand(command) {
    const normalized = normalizeText(command);

    const neighborhoodMatch = normalized.match(/(?:bairro|frete para|frete do)\s+([a-z0-9\s]+?)\s+(?:r\$)?\s*([\d,.]+)$/);
    if (neighborhoodMatch) {
        const name = titleCase(neighborhoodMatch[1].trim());
        const fee = toNumber(neighborhoodMatch[2]);

        salvarBairro({ nome: name, taxa: fee, ativo: true });
        switchView('deliveryView');
        return `Taxa de ${formatCurrency(fee)} aplicada para ${name}.`;
    }

    const toggleProductMatch = normalized.match(/\b(ativar|desativar|ocultar)\b\s+(?:produto\s+)?(.+)/);
    if (toggleProductMatch && mentionsMenu(normalized)) {
        const shouldShow = toggleProductMatch[1] === 'ativar';
        const product = findProductByName(toggleProductMatch[2]);

        if (!product) return 'Nao encontrei esse produto no cardapio.';

        product.visible = shouldShow;
        updateDoc(doc(db, "produtos", product.id), { visible: shouldShow });
        switchView('menuView');
        return `${product.name} agora esta ${shouldShow ? 'visivel' : 'oculto'} no site.`;
    }

    const paymentMatch = normalized.match(/\b(ativar|desativar)\b\s+(pix|cartao|cartao de credito|cartao de debito|dinheiro)/);
    if (paymentMatch) {
        const enabled = paymentMatch[1] === 'ativar';
        const paymentKey = paymentToKey(paymentMatch[2]);
        delivery.payments[paymentKey] = enabled;
        atualizarConfiguracoes(delivery.payments);
        switchView('deliveryView');
        return `${paymentLabel(paymentKey)} ${enabled ? 'ativado' : 'desativado'} no checkout.`;
    }

    if (normalized.includes('mais vendido') || normalized.includes('ranking')) {
        const ranking = getFinanceSummary().ranking;
        switchView('financeView');
        return ranking.length ? `Produto mais vendido: ${ranking[0].name}, com ${ranking[0].quantity} unidades.` : 'Ainda nao ha vendas suficientes para ranking.';
    }

    if (mentionsFinance(normalized)) {
        const summary = getFinanceSummary();
        switchView('financeView');
        return `Faturamento: hoje ${formatCurrency(summary.daily.total)}, semana ${formatCurrency(summary.weekly.total)}, mes ${formatCurrency(summary.monthly.total)}.`;
    }

    if (mentionsMenu(normalized)) {
        const active = products.filter(isProductAvailable).length;
        const hidden = products.filter((product) => !isProductAvailable(product)).length;
        switchView('menuView');
        return `Cardapio com ${products.length} produtos, ${active} visiveis e ${hidden} ocultos ou sem estoque.`;
    }

    if (mentionsDelivery(normalized)) {
        switchView('deliveryView');
        return `Entrega com ${delivery.neighborhoods.length} bairros cadastrados. Pagamentos: ${getActivePayments().join(', ') || 'nenhum metodo ativo'}.`;
    }

    return 'Posso atuar apenas em Gestao do Cardapio, Entrega/Pagamento e Dashboard Financeiro.';
}

function getSortedCategories() {
    return [...categories].sort((a, b) => a.order - b.order);
}

function getSortedProducts() {
    const orderByCategory = new Map(getSortedCategories().map((category, index) => [category.name, index]));

    return [...products].sort((a, b) => {
        const categoryDiff = (orderByCategory.get(a.category) ?? 99) - (orderByCategory.get(b.category) ?? 99);
        if (categoryDiff !== 0) return categoryDiff;
        return a.name.localeCompare(b.name, 'pt-BR');
    });
}

function getActivePayments() {
    const labels = [];
    if (delivery.payments.pix) labels.push('Pix');
    if (delivery.payments.card) labels.push('Cartao');
    if (delivery.payments.cash) labels.push('Dinheiro');
    return labels;
}

function getFinanceSummary() {
    const now = new Date();
    const todayIso = toIsoDate(now);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    const month = now.getMonth();
    const year = now.getFullYear();

    const dailyOrders = orders.filter((order) => order.date === todayIso);
    const weeklyOrders = orders.filter((order) => new Date(`${order.date}T00:00:00`) >= startOfDay(weekStart));
    const monthlyOrders = orders.filter((order) => {
        const date = new Date(`${order.date}T00:00:00`);
        return date.getMonth() === month && date.getFullYear() === year;
    });

    // Filtro para o ranking baseado no seletor de datas
    const rangeOrders = orders.filter((order) => {
        const d = new Date(`${order.date}T00:00:00`);
        return d >= startOfDay(pickerRange.start) && d <= startOfDay(pickerRange.end);
    });

    const monthlyTotal = sumOrders(monthlyOrders);

    return {
        daily: { count: dailyOrders.length, total: sumOrders(dailyOrders) },
        weekly: { count: weeklyOrders.length, total: sumOrders(weeklyOrders) },
        monthly: { count: monthlyOrders.length, total: monthlyTotal },
        ranking: getProductRanking(rangeOrders)
    };
}

function getSalesChartData() {
    const start = startOfDay(pickerRange.start);
    const end = startOfDay(pickerRange.end);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Caso 1: 1 a 7 dias (Exibe dias da semana: Seg, Ter...)
    if (diffDays <= 7) {
        return Array.from({ length: diffDays }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            const isoDate = toIsoDate(date);
            const dayOrders = orders.filter(o => o.date === isoDate);
            return {
                label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
                total: sumOrders(dayOrders)
            };
        });
    } 
    // Caso 2: Até 60 dias (Agrupa em blocos de 5 dias para manter a fluidez)
    else if (diffDays <= 60) {
        const points = [];
        for (let i = 0; i < diffDays; i += 5) {
            let total = 0;
            const blockStart = new Date(start);
            blockStart.setDate(start.getDate() + i);
            
            for (let j = 0; j < 5; j++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i + j);
                if (date > end) break;
                total += sumOrders(orders.filter(o => o.date === toIsoDate(date)));
            }
            
            points.push({
                label: `${blockStart.getDate().toString().padStart(2, '0')}/${(blockStart.getMonth() + 1).toString().padStart(2, '0')}`,
                total
            });
        }
        return points;
    } 
    // Caso 3: Período longo (Agrupa por mês: Mar, Abr...)
    else {
        const points = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const last = new Date(end.getFullYear(), end.getMonth(), 1);

        while (current <= last) {
            const m = current.getMonth();
            const y = current.getFullYear();
            const monthOrders = orders.filter(o => {
                const d = new Date(`${o.date}T00:00:00`);
                return d.getMonth() === m && d.getFullYear() === y && d >= start && d <= end;
            });

            points.push({
                label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(current).replace('.', ''),
                total: sumOrders(monthOrders)
            });
            current.setMonth(current.getMonth() + 1);
        }
        return points;
    }
}

function getProductRanking(sourceOrders) {
    const rankingMap = new Map();

    sourceOrders.forEach((order) => {
        order.items.forEach((item) => {
            const current = rankingMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
            current.quantity += Number(item.quantity || 0);
            current.revenue += Number(item.quantity || 0) * Number(item.unitPrice || 0);
            rankingMap.set(item.name, current);
        });
    });

    return [...rankingMap.values()].sort((a, b) => b.quantity - a.quantity);
}

function sumOrders(sourceOrders) {
    return sourceOrders.reduce((total, order) => total + getOrderTotal(order), 0);
}

function getOrderTotal(order) {
    const subtotal = (order.items || []).reduce((total, item) => {
        return total + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    return subtotal + Number(order.deliveryFee || 0);
}

function isProductAvailable(product) {
    if (product.status === 'oculto') return false;
    if (!tracksStock(product)) return true;
    return Number(product.stock || 0) > 0;
}

function tracksStock(product) {
    const category = normalizeText(typeof product === 'string' ? product : product?.category);
    const name = normalizeText(typeof product === 'string' ? '' : product?.name);
    return category.includes('bebida') || category.includes('refrigerante') || name.includes('refrigerante');
}

function syncStockFieldVisibility(product = null) {
    const category = product?.category || elements.productCategory.value;
    const name = product?.name || document.getElementById('productName').value;
    const shouldShow = tracksStock({ category, name });
    const stockInput = document.getElementById('productStock');

    elements.stockGroup.style.display = shouldShow ? 'block' : 'none';
    stockInput.required = shouldShow;

    if (!shouldShow) {
        stockInput.value = '';
    }
}

function normalizeAddon(addon) {
    return {
        id: addon.id || `addon-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: String(addon.name || '').trim(),
        price: toNumber(addon.price)
    };
}

function renderAddonEditor(addons = standardAddons) {
    if (!addons.length) {
        elements.addonsEditor.innerHTML = '<p class="empty-state small">Nenhum adicional cadastrado.</p>';
        return;
    }

    elements.addonsEditor.innerHTML = addons.map((addon) => `
        <div class="addon-row" data-id="${escapeAttribute(addon.id)}">
            <input type="text" class="addon-row-name" value="${escapeAttribute(addon.name)}" placeholder="Nome">
            <input type="number" class="addon-row-price" value="${Number(addon.price || 0).toFixed(2)}" placeholder="Valor" step="0.01" min="0">
            <button type="button" class="icon-button danger" data-addon-action="remove" title="Remover">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function collectAddonEditorRows() {
    return [...elements.addonsEditor.querySelectorAll('.addon-row')]
        .map((row) => normalizeAddon({
            id: row.dataset.id,
            name: row.querySelector('.addon-row-name')?.value,
            price: row.querySelector('.addon-row-price')?.value
        }))
        .filter((addon) => addon.name);
}

function addAddonFromInputs() {
    const name = elements.addonName.value.trim();
    const price = toNumber(elements.addonPrice.value);
    if (!name) return;

    const addons = collectAddonEditorRows();
    addons.push(normalizeAddon({ name, price }));
    standardAddons = addons;
    elements.addonName.value = '';
    elements.addonPrice.value = '';
    renderAddonEditor(standardAddons);
}

function handleAddonEditorAction(event) {
    const button = event.target.closest('[data-addon-action="remove"]');
    if (!button) return;

    const row = button.closest('.addon-row');
    row?.remove();
}

function openDatePicker() {
    document.getElementById('datePickerModal').classList.add('active');
    renderDatePicker();
}

function closeDatePicker() {
    document.getElementById('datePickerModal').classList.remove('active');
}

function renderDatePicker() {
    const container = document.getElementById('datePickerCalendars');
    container.innerHTML = '';
    
    const now = new Date();
    const isMobile = window.innerWidth <= 768;
    
    // No mobile renderiza 1 mês, no desktop 2 meses
    const startOffset = isMobile ? 0 : -1;

    for (let i = startOffset; i <= 0; i++) {
        const offsetIndex = i + pickerMonthOffset;
        const date = new Date(now.getFullYear(), now.getMonth() + offsetIndex, 1);
        
        // Define se deve exibir as setas de navegação
        const showPrev = isMobile || (i === -1);
        const showNext = isMobile || (i === 0);
        
        container.appendChild(createCalendarMonth(date.getMonth(), date.getFullYear(), showPrev, showNext));
    }
    updateRangeDisplay();
}

function createCalendarMonth(month, year, showPrev = false, showNext = false) {
    const div = document.createElement('div');
    div.className = 'calendar-month';
    
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    let html = `
        <div class="calendar-header">
            ${showPrev ? '<button class="nav-month-btn" data-nav="-1" title="Mês anterior"><i class="fas fa-chevron-left"></i></button>' : '<div></div>'}
            <h4>${name}</h4>
            ${showNext ? '<button class="nav-month-btn" data-nav="1" title="Próximo mês"><i class="fas fa-chevron-right"></i></button>' : '<div></div>'}
        </div>
        <div class="days-grid">`;
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(d => html += `<div class="day-label">${d}</div>`);
    
    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
    
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const isStart = isSameDay(date, pickerRange.start);
        const isEnd = isSameDay(date, pickerRange.end);
        const isSelected = isStart || isEnd;
        const inRange = pickerRange.start && pickerRange.end && date > pickerRange.start && date < pickerRange.end;
        
        let classNames = ['calendar-day'];
        if (isSelected) classNames.push('selected');
        if (isStart) classNames.push('range-start');
        if (isEnd) classNames.push('range-end');
        if (inRange) classNames.push('in-range');
        
        html += `<div class="${classNames.join(' ')}" data-date="${date.toISOString()}">${d}</div>`;
    }
    
    div.innerHTML = html + '</div>';
    return div;
}

function handleDateClick(e) {
    const navBtn = e.target.closest('.nav-month-btn');
    if (navBtn) {
        pickerMonthOffset += parseInt(navBtn.dataset.nav);
        renderDatePicker();
        return;
    }

    const day = e.target.closest('.calendar-day:not(.empty)');
    if (!day) return;

    const clicked = new Date(day.dataset.date);
    if (!pickerRange.start || (pickerRange.start && pickerRange.end)) {
        pickerRange.start = clicked;
        pickerRange.end = null;
    } else {
        if (clicked < pickerRange.start) {
            pickerRange.end = pickerRange.start;
            pickerRange.start = clicked;
        } else {
            pickerRange.end = clicked;
        }
    }
    renderDatePicker();
}

function handlePresetClick(e) {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const now = new Date();
    const preset = btn.dataset.preset;

    if (preset === '24h') {
        pickerRange.start = new Date(new Date().setHours(now.getHours() - 24));
        pickerRange.end = now;
    } else if (preset === '7d') {
        pickerRange.start = new Date(new Date().setDate(now.getDate() - 6));
        pickerRange.end = now;
    } else if (preset === 'month') {
        pickerRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
        pickerRange.end = now;
    }
    renderDatePicker();
}

function updateRangeDisplay() {
    const display = document.getElementById('selectedRangeDisplay');
    if (!pickerRange.start) return;

    const opt = { day: 'numeric', month: 'long' };
    const startStr = pickerRange.start.toLocaleDateString('pt-BR', opt);
    
    if (!pickerRange.end) {
        display.textContent = `${startStr} – ...`;
    } else {
        const endStr = pickerRange.end.toLocaleDateString('pt-BR', { ...opt, year: 'numeric' });
        display.textContent = `${startStr} – ${endStr}`;
    }
}

function applyDateRange() {
    if (!pickerRange.start || !pickerRange.end) return;
    document.getElementById('activeFilterLabel').textContent = document.getElementById('selectedRangeDisplay').textContent;
    closeDatePicker();
    ordersVisibleCount = 0; // Reseta o limite ao mudar o filtro de data
    renderFinance(); // Atualiza os dados baseados no novo range
}

function isSameDay(d1, d2) {
    return d1 && d2 && d1.getFullYear() === d2.getFullYear() && 
           d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function makeOrder(daysAgo, paymentMethod, deliveryFee, time, items) {
    return {
        id: `order-${daysAgo}-${paymentMethod}-${items.length}`,
        date: daysAgoDate(daysAgo),
        time,
        paymentMethod,
        deliveryFee,
        items,
        total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) + deliveryFee
    };
}

function daysAgoDate(daysAgo) {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return toIsoDate(date);
}

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(value) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatCompactCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function toNumber(value) {
    if (typeof value === 'number') return value;
    const normalized = String(value || '0').trim();
    if (normalized.includes(',')) {
        return Number(normalized.replace(/\./g, '').replace(',', '.')) || 0;
    }

    return Number(normalized) || 0;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showAssistantResponse(message) {
    elements.assistantResponse.textContent = message;
}

function findProductByName(name) {
    const needle = normalizeText(name);
    return products.find((product) => normalizeText(product.name).includes(needle) || needle.includes(normalizeText(product.name)));
}

function mentionsMenu(value) {
    return /(cardapio|produto|categoria|estoque|adicional|opcional|variacao|preco|pastel)/.test(value);
}

function mentionsDelivery(value) {
    return /(frete|entrega|bairro|pagamento|checkout|pix|cartao|dinheiro)/.test(value);
}

function mentionsFinance(value) {
    return /(faturamento|financeiro|relatorio|vendas|pedido|diario|semanal|mensal)/.test(value);
}

function paymentToKey(value) {
    if (value.includes('pix')) return 'pix';
    if (value.includes('cartao')) return 'card';
    return 'cash';
}

function paymentLabel(key) {
    return {
        pix: 'Pix',
        card: 'Cartao',
        cash: 'Dinheiro'
    }[key];
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function titleCase(value) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function slugify(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}
