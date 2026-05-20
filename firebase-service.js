import { db } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    setDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy, 
    writeBatch,
    updateDoc,
    deleteDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log('Instância do DB no Firebase Service:', db);

const slugify = (text) => {
    return text.toString().toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
};

/**
 * Realiza o upload da imagem para o ImgBB e retorna o link direto
 */
export async function uploadImagem(imagemFile) {
    const formData = new FormData();
    formData.append("image", imagemFile);

    const response = await fetch("https://api.imgbb.com/1/upload?key=91337b2ad193508a2bda60e8fde127a3", {
        method: "POST",
        body: formData
    });

    const result = await response.json();
    
    if (result.success) {
        return result.data.url;
    } else {
        throw new Error("Erro ao realizar upload para o ImgBB: " + (result.error?.message || "Erro desconhecido"));
    }
}

/**
 * 2.1 Excluir uma categoria específica
 */
export async function excluirCategoria(id) {
    try {
        await deleteDoc(doc(db, "categorias", id));
    } catch (error) {
        console.error("Erro ao excluir categoria (Firebase Service):", error);
        throw error;
    }
}

/**
 * 1. Adicionar Produto no Firestore
 */
export async function adicionarProduto(produto) {
    try {
        const dadosProduto = {
            name: produto.name,
            description: produto.description,
            price: Number(produto.price),
            category: produto.category,
            status: produto.status,
            image: produto.image,
            hasAddons: produto.hasAddons || false,
            addons: produto.addons || [], 
            stock: produto.stock !== undefined ? produto.stock : null, // Adiciona controle de estoque
            dataCriacao: new Date()
        };

        // Salva no Firestore
        return await addDoc(collection(db, "produtos"), dadosProduto);
    } catch (error) {
        console.error("Erro ao salvar produto:", error);
        throw error;
    }
}

/**
 * 1.1 Atualizar apenas o status do produto utilizando updateDoc
 */
export async function atualizarStatusProduto(id, novoStatus) {
    try {
        const productRef = doc(db, "produtos", id);
        await updateDoc(productRef, { status: novoStatus });
    } catch (error) {
        console.error("Erro ao atualizar status do produto:", error);
        throw error;
    }
}

/**
 * 2. Salvar Categorias e Ordem de Exibição
 * Usa Batch Writes para garantir que todas as categorias sejam atualizadas juntas
 */
export async function salvarCategorias(listaCategorias) {
    try {
        const batch = writeBatch(db);

        listaCategorias.forEach((cat) => {
            const catRef = doc(db, "categorias", cat.id || slugify(cat.name));
            batch.set(catRef, {
                nome: cat.name || "Sem nome",
                ordem: Number(cat.order),
                ativo: cat.active !== false
            });
        });

        await batch.commit();
    } catch (error) {
        console.error("Erro ao salvar categorias (Firebase Service):", error);
        throw error;
    }
}

/**
 * 2.2 Gerenciar Coleção de Adicionais Globais
 */
export async function salvarAdicional(adicional) {
    try {
        const docRef = doc(db, "adicionais", adicional.id || slugify(adicional.nome));
        await setDoc(docRef, {
            nome: adicional.nome,
            preco: Number(adicional.preco),
            ativo: adicional.ativo !== false
        });
    } catch (error) {
        console.error("Erro ao salvar adicional (Firebase Service):", error);
        throw error;
    }
}

export async function excluirAdicional(id) {
    try {
        await deleteDoc(doc(db, "adicionais", id));
    } catch (error) {
        console.error("Erro ao excluir adicional (Firebase Service):", error);
        throw error;
    }
}

/**
 * 3. Atualizar Configurações Gerais (Taxas e Pagamentos)
 */
export async function atualizarConfiguracoes(metodosPagamento) {
    try {
        const configRef = doc(db, "configuracoes", "geral");
        await setDoc(configRef, {
            pagamentos: metodosPagamento, // Objeto {pix, cartao, dinheiro}
            ultimaAtualizacao: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Erro ao atualizar configurações (Firebase Service):", error);
        throw error;
    }
}

/**
 * 3.1 Gerenciar Bairros Independentes
 */
export async function salvarBairro(bairro) {
    try {
        const docRef = doc(db, "bairros", bairro.id || slugify(bairro.nome));
        await setDoc(docRef, {
            nome: bairro.nome,
            taxa: Number(bairro.taxa),
            ativo: bairro.ativo !== false
        });
    } catch (error) {
        console.error("Erro ao salvar bairro (Firebase Service):", error);
        throw error;
    }
}

export async function excluirBairro(id) {
    try {
        await deleteDoc(doc(db, "bairros", id));
    } catch (error) {
        console.error("Erro ao excluir bairro (Firebase Service):", error);
        throw error;
    }
}

/**
 * 4. Ouvir Pedidos em Tempo Real
 * Essencial para que o gráfico e a lista financeira atualizem sem refresh
 */
export function ouvirPedidos(callbackSetPedidos) {
    const q = query(
        collection(db, "pedidos"), 
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, 
        (snapshot) => {
            const listaDePedidos = [];
            snapshot.forEach((doc) => {
                const dados = doc.data();
                console.log("Pedido recebido do Firestore ID:", doc.id, dados);
                listaDePedidos.push({ id: doc.id, ...dados });
            });
            console.log("Total de pedidos processados para renderização:", listaDePedidos.length);
            callbackSetPedidos(listaDePedidos);
        },
        (error) => {
            console.error("Erro crítico no Firestore (ouvirPedidos):", error);
            // Aqui você poderia disparar um alerta visual para o usuário se desejar
        }
    );
}