import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { calcularPrecoPrazo } from 'correios-brasil';

import { MercadoPagoConfig, Payment } from 'mercadopago';

dotenv.config();

// Initialize Firebase Admin (Required for secure backend writes like order creation, point generation, inventory)
// Will gracefully fail if GOOGLE_APPLICATION_CREDENTIALS or specific admin variables aren't set yet.
if (!admin.getApps().length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.log("Firebase Admin could not initialize. Make sure GOOGLE_APPLICATION_CREDENTIALS or Firebase functions environment is set if doing backend ops.");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Client Initialization
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes

  // --- COMMUNITY RATE LIMITING ---
  const rateLimits = new Map<string, { count: number, resetAt: number }>();
  function checkRateLimit(uid: string, endpoint: string, limit: number, windowMs: number) {
    const key = `${uid}_${endpoint}`;
    const now = Date.now();
    let record = rateLimits.get(key);
    
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
    }
    
    record.count++;
    rateLimits.set(key, record);
    
    return record.count <= limit;
  }

  function containsPII(text: string): boolean {
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const cpfRegex = /\b\d{3}[\.?]\d{3}[\.?]\d{3}[-?]\d{2}\b/;
    const phoneRegex = /\b\+?\d{1,3}?[- .]?\(?\d{2,3}\)?[- .]?\d{4,5}[- .]?\d{4}\b/;
    
    return emailRegex.test(text) || cpfRegex.test(text) || phoneRegex.test(text);
  }

  async function getUserIdFromReq(req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Unauthorized');
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  }

  // --- COMMUNITY ENDPOINTS ---
  app.post("/api/community/posts", async (req, res) => {
    try {
      const uid = await getUserIdFromReq(req);
      if (!checkRateLimit(uid, 'create_post', 3, 60000)) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const { content, dropId } = req.body;
      if (!content || typeof content !== 'string' || content.length < 1 || content.length > 500) {
        return res.status(400).json({ error: "Invalid content length (1-500)" });
      }
      if (containsPII(content)) return res.status(400).json({ error: "Content contains restricted personal information (PII)" });

      const db = getFirestore();
      
      if (dropId) {
        const dropSnap = await db.collection('drops').doc(dropId).get();
        if (!dropSnap.exists) return res.status(404).json({ error: "Drop not found" });
      }

      const postRef = db.collection('posts').doc();
      const newPost = {
        id: postRef.id,
        authorId: uid,
        content: content.trim(),
        dropId: dropId || null,
        likesCount: 0,
        commentsCount: 0,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await postRef.set(newPost);
      res.json({ success: true, post: newPost });
    } catch(err: any) {
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  });

  app.post("/api/community/comments", async (req, res) => {
    try {
      const uid = await getUserIdFromReq(req);
      if (!checkRateLimit(uid, 'create_comment', 5, 60000)) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const { postId, content } = req.body;
      if (!postId) return res.status(400).json({ error: "postId required" });
      if (!content || typeof content !== 'string' || content.length < 1 || content.length > 500) {
        return res.status(400).json({ error: "Invalid content length (1-500)" });
      }
      if (containsPII(content)) return res.status(400).json({ error: "Content contains restricted personal information (PII)" });

      const db = getFirestore();
      const postRef = db.collection('posts').doc(postId);
      const commentRef = db.collection('comments').doc();
      
      let newComment: any = null;
      await db.runTransaction(async (t) => {
        const postSnap = await t.get(postRef);
        if (!postSnap.exists) throw new Error("Post not found");
        
        newComment = {
          id: commentRef.id,
          postId,
          authorId: uid,
          content: content.trim(),
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        t.set(commentRef, newComment);
        t.update(postRef, { commentsCount: FieldValue.increment(1) });
      });

      res.json({ success: true, comment: newComment });
    } catch(err: any) {
      if (err.message === 'Post not found') return res.status(404).json({ error: err.message });
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  });

  app.post("/api/community/like", async (req, res) => {
    try {
      const uid = await getUserIdFromReq(req);
      if (!checkRateLimit(uid, 'like', 20, 60000)) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const { targetId, targetType } = req.body;
      if (!targetId || !['POST', 'COMMENT'].includes(targetType)) return res.status(400).json({ error: "Invalid payload" });
      
      const db = getFirestore();
      const targetCollection = targetType === 'POST' ? 'posts' : 'comments';
      const likesCollection = targetType === 'POST' ? 'postLikes' : 'commentLikes';
      
      const targetRef = db.collection(targetCollection).doc(targetId);
      const likeId = `${targetId}_${uid}`;
      const likeRef = db.collection(likesCollection).doc(likeId);

      await db.runTransaction(async (t) => {
        const likeSnap = await t.get(likeRef);
        if (likeSnap.exists) throw new Error("ALREADY_LIKED"); // Idempotent block
        
        const targetSnap = await t.get(targetRef);
        if (!targetSnap.exists) throw new Error("Target not found");
        
        t.set(likeRef, {
          id: likeId,
          [targetType === 'POST' ? 'postId' : 'commentId']: targetId,
          userId: uid,
          createdAt: new Date().toISOString()
        });
        
        t.update(targetRef, { likesCount: FieldValue.increment(1) });
      });
      
      res.json({ success: true });
    } catch(err: any) {
      if (err.message === 'ALREADY_LIKED') return res.json({ success: true, message: 'Already liked' });
      if (err.message === 'Target not found') return res.status(404).json({ error: err.message });
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  });

  app.post("/api/community/unlike", async (req, res) => {
    try {
      const uid = await getUserIdFromReq(req);
      if (!checkRateLimit(uid, 'like', 20, 60000)) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const { targetId, targetType } = req.body;
      if (!targetId || !['POST', 'COMMENT'].includes(targetType)) return res.status(400).json({ error: "Invalid payload" });
      
      const db = getFirestore();
      const targetCollection = targetType === 'POST' ? 'posts' : 'comments';
      const likesCollection = targetType === 'POST' ? 'postLikes' : 'commentLikes';
      
      const targetRef = db.collection(targetCollection).doc(targetId);
      const likeId = `${targetId}_${uid}`;
      const likeRef = db.collection(likesCollection).doc(likeId);

      await db.runTransaction(async (t) => {
        const likeSnap = await t.get(likeRef);
        if (!likeSnap.exists) throw new Error("NOT_LIKED"); // Idempotent block
        
        const targetSnap = await t.get(targetRef);
        if (!targetSnap.exists) throw new Error("Target not found");
        
        t.delete(likeRef);
        t.update(targetRef, { likesCount: FieldValue.increment(-1) });
      });
      
      res.json({ success: true });
    } catch(err: any) {
      if (err.message === 'NOT_LIKED') return res.json({ success: true, message: 'Not liked' });
      if (err.message === 'Target not found') return res.status(404).json({ error: err.message });
      res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  });

  app.post("/api/community/reports", async (req, res) => {
    try {
      const uid = await getUserIdFromReq(req);
      if (!checkRateLimit(uid, 'report', 5, 60000)) return res.status(429).json({ error: "Rate limit exceeded" });
      
      const { targetId, targetType, reason } = req.body;
      if (!targetId || !['POST', 'COMMENT', 'PROFILE'].includes(targetType) || !reason) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const db = getFirestore();
      const reportId = `${targetId}_${uid}`; // 1 active report per user per target
      const reportRef = db.collection('reports').doc(reportId);

      await db.runTransaction(async (t) => {
        const snap = await t.get(reportRef);
        if (snap.exists) throw new Error("ALREADY_REPORTED");
        
        t.set(reportRef, {
          id: reportId,
          targetId,
          targetType,
          reporterId: uid,
          reason,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      });
      
      res.json({ success: true });
    } catch(err: any) {
       if (err.message === 'ALREADY_REPORTED') return res.json({ success: true, message: 'Already reported' });
       res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
    }
  });

  
  app.get("/api/test-mp-env", (req, res) => {
    res.json({
      PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
      MERCADOPAGO_ENVIRONMENT: process.env.MERCADOPAGO_ENVIRONMENT,
      MERCADOPAGO_ACCESS_TOKEN_EXISTS: !!process.env.MERCADOPAGO_ACCESS_TOKEN
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      
      const contents = [];
      if (history && Array.isArray(history)) {
        contents.push(...history);
      }
      contents.push(prompt);

            // In a real scenario, we could fetch products here to inject context
      let contextStr = "";
      if (admin.getApps().length) {
         try {
           const db = getFirestore();
           
           // Fetch Products
           const productsSnap = await db.collection('products').where('active', '==', true).get();
           const productList = productsSnap.docs.map(d => `${d.data().name} (R${d.data().price})`).join(", ");
           
           // Fetch Drops
           const dropsSnap = await db.collection('drops').get();
           const dropList = dropsSnap.docs.map(d => {
              const data = d.data();
              return `- DROP ${data.name} (Status: ${data.status}): ${data.title}. ${data.description}. Edição Limitada: ${data.limited ? 'Sim' : 'Não'}.`;
           }).join("\n");

           contextStr = `Produtos atuais: ${productList}\n\nStatus dos Drops no PupaVerso:\n${dropList}\n\nBaseie suas respostas rigorosamente nestes dados. Nunca invente estoques, valores, datas ou produtos. Se um Drop estiver EM BREVE, diga que está a caminho.`;
         } catch(e) {}
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction: `Você é PUPA AI, o guia digital da PUPA COLLECTION.
Você deve adotar uma persona underground, streetwear, misteriosa e tecnológica.
Seja breve, preciso e útil. Use frases da marca como 'ACESSO LIBERADO', 'EVOLUA PARA DESBLOQUEAR', 'ENTRE PARA O MOVIMENTO'.
Responda SEMPRE em Português do Brasil (pt-BR), a menos que o usuário solicite outro idioma.
Não aja como uma IA genérica. Você faz parte da cultura PUPA.
Você pode ajudar os usuários a encontrar produtos, explicar tamanhos e o sistema de PUPA POINTS (R$1 = 10 PUPA POINTS).
A IA NÃO tem permissão e NÃO deve alterar diretamente estoque, pedidos, preços, usuários, permissões, pontos ou troféus.

Sobre a instalação do app PUPA (PWA):
- Se o usuário perguntar como instalar no Android: Diga para ele usar o botão "INSTALAR PUPA" no final da tela principal (Home), no banner inferior, ou acessar as configurações da Conta. Ele também pode usar o menu do navegador ("Instalar aplicativo" ou "Adicionar à tela inicial").
- Se perguntar sobre iPhone/iOS: Diga que a Apple restringe instalações automáticas, então ele deve tocar no botão Compartilhar do Safari (o quadrado com uma seta) e escolher "Adicionar à Tela de Início".
${contextStr}`,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate response." });
    }
  });

  // CHECKOUT API
  
  // SHIPPING API
  app.post("/api/shipping/calculate", async (req, res) => {
    try {
      const { cep } = req.body;
      if (!cep) return res.status(400).json({ error: "CEP destino não informado" });

      const cleanCep = cep.replace(/D/g, '');
      if (cleanCep.length !== 8) return res.status(400).json({ error: "CEP inválido" });

      // CEP de Origem (Ex: São Paulo)
      const originCep = process.env.STORE_CEP || '01001000';

      const args = {
        sCepOrigem: originCep,
        sCepDestino: cleanCep,
        nVlPeso: '1',
        nCdFormato: '1',
        nVlComprimento: '20',
        nVlAltura: '20',
        nVlLargura: '20',
        nCdServico: ['04014', '04510'], // 04014 = SEDEX, 04510 = PAC
        nVlDiametro: '0',
      };

      try {
         const correiosResponse = await calcularPrecoPrazo(args);
         const options = correiosResponse.map((item: any) => {
             const isSedex = item.Codigo === '04014';
             return {
                 name: isSedex ? 'SEDEX' : 'PAC',
                 price: parseFloat(item.Valor.replace(',', '.')),
                 deadline: parseInt(item.PrazoEntrega, 10),
                 code: item.Codigo,
                 error: item.MsgErro !== '' ? item.MsgErro : null
             };
         }).filter((o: any) => !o.error);

         if (options.length > 0) {
             return res.json({ options });
         }
      } catch (correiosError: any) {
         if (correiosError.code === 'ETIMEDOUT') {
            console.warn("Correios API Error: ETIMEDOUT (API lenta ou fora do ar). Usando fallback.");
         } else {
            console.warn("Correios API Error:", correiosError.message || correiosError);
         }
      }

      // Fallback in case Correios API is down
      res.json({
        options: [
           { name: 'PAC', price: 25.90, deadline: 7, code: '04510', error: null },
           { name: 'SEDEX', price: 45.90, deadline: 2, code: '04014', error: null }
        ]
      });

    } catch (error: any) {
      console.error("Shipping Error:", error);
      res.status(500).json({ error: error.message || "Failed to calculate shipping" });
    }
  });

  app.post("/api/payments/create", async (req, res) => {
    try {
      if (!admin.getApps().length) {
        return res.status(500).json({ error: "Firebase Admin is not configured. Cannot process order safely." });
      }

      const db = getFirestore();
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { items, customerSnapshot, shippingAddress, shippingPrice, shippingCode } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Carrinho vazio" });
      }

      let subtotal = 0;
      const orderItems: any[] = [];

      await db.runTransaction(async (transaction) => {
        for (const item of items) {
          const variantRef = db.collection('productVariants').doc(item.variantId);
          const productRef = db.collection('products').doc(item.productId);
          
          const variantSnap = await transaction.get(variantRef);
          const productSnap = await transaction.get(productRef);

          if (!variantSnap.exists || !productSnap.exists) {
            throw new Error(`Produto não encontrado: ${item.productId}`);
          }

          const variantData = variantSnap.data() as any;
          const productData = productSnap.data() as any;

          if (variantData.stock < item.quantity) {
             throw new Error(`Estoque insuficiente para ${productData.name} - ${variantData.color}/${variantData.size}`);
          }

          const unitPrice = productData.promoPrice || productData.price;
          subtotal += (unitPrice * item.quantity);

          orderItems.push({
            productId: item.productId,
            variantId: item.variantId,
            name: productData.name,
            color: variantData.color,
            size: variantData.size,
            sku: variantData.sku,
            quantity: item.quantity,
            unitPrice: unitPrice,
            subtotal: unitPrice * item.quantity
          });

          transaction.update(variantRef, { stock: FieldValue.increment(-item.quantity) });
        }
      });

      const publicOrderCode = 'PUPA-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const orderRef = db.collection('orders').doc();
      
      const orderData = {
        id: orderRef.id,
        userId,
        publicOrderCode,
        items: orderItems,
        subtotal,
        discount: 0,
        shipping: shippingPrice || 0,
        shippingCode: shippingCode || '',
        total: subtotal + (shippingPrice || 0),
        status: 'AGUARDANDO PAGAMENTO',
        paymentStatus: 'AGUARDANDO PAGAMENTO',
        paymentProvider: 'MERCADO_PAGO',
        customerSnapshot,
        shippingAddress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mpSecret = process.env.MERCADOPAGO_ACCESS_TOKEN;
      let paymentDetails = null;

      if (mpSecret) {
        try {
          const client = new MercadoPagoConfig({ accessToken: mpSecret, options: { timeout: 5000 } });
          const payment = new Payment(client);
          
          const mpResponse = await payment.create({
            body: {
              transaction_amount: Number((subtotal + (shippingPrice || 0)).toFixed(2)),
              description: `PUPA COLLECTION - Pedido ${publicOrderCode}`,
              payment_method_id: 'pix',
              payer: {
                email: customerSnapshot.email,
                identification: {
                  type: 'CPF',
                  number: customerSnapshot.cpf.replace(/\D/g, '')
                }
              }
            }
          });

          paymentDetails = {
            qrCode: mpResponse.point_of_interaction?.transaction_data?.qr_code,
            qrCodeBase64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
            ticketUrl: mpResponse.point_of_interaction?.transaction_data?.ticket_url,
            paymentId: mpResponse.id?.toString()
          };

          (orderData as any).paymentId = paymentDetails.paymentId;
          (orderData as any).paymentDetails = paymentDetails;
          
        } catch (mpError) {
          console.error("Mercado Pago Error:", mpError);
          // Revert stock logic could be added here in a robust system
          throw new Error("Erro ao gerar pagamento PIX. Verifique os dados.");
        }
      } else {
         console.warn("MERCADO PAGO AGUARDANDO CREDENCIAIS - Fallback ativado.");
         paymentDetails = {
            qrCode: "MOCK_QR_CODE_CREDENCIAIS_AUSENTES",
            qrCodeBase64: "",
            paymentId: "mock-" + Date.now()
         };
         (orderData as any).paymentId = paymentDetails.paymentId;
         (orderData as any).paymentDetails = paymentDetails;
      }

      await orderRef.set(orderData);

      res.json({ success: true, orderId: orderRef.id, publicOrderCode, paymentDetails });
    } catch (error: any) {
      console.error("Checkout Error:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  
  
  // REWARD REDEMPTION API
  app.post("/api/admin/community/moderate", async (req, res) => {
    try {
      if (!admin.getApps().length) return res.status(500).json({ error: "Firebase Admin not configured" });
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const db = getFirestore();
      
      const adminProfile = await db.collection('profiles').doc(userId).get();
      if (!adminProfile.exists || !['ADMIN', 'SUPER_ADMIN'].includes(adminProfile.data()?.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { reportId, targetId, targetType, action } = req.body;
      if (!reportId || !targetId || !['POST', 'COMMENT', 'PROFILE'].includes(targetType) || !['KEEP', 'HIDE'].includes(action)) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const reportRef = db.collection('reports').doc(reportId);
      let targetRef: FirebaseFirestore.DocumentReference | undefined;
      if (targetType === 'POST') targetRef = db.collection('posts').doc(targetId);
      else if (targetType === 'COMMENT') targetRef = db.collection('comments').doc(targetId);
      else if (targetType === 'PROFILE') targetRef = db.collection('publicProfiles').doc(targetId);
      
      if (!targetRef) return res.status(400).json({ error: "Invalid target" });

      await db.runTransaction(async (t) => {
        const reportSnap = await t.get(reportRef);
        if (!reportSnap.exists) throw new Error("REPORT_NOT_FOUND");
        
        // Always resolve the report
        t.update(reportRef, { 
          status: action === 'HIDE' ? 'RESOLVED' : 'DISMISSED',
          resolvedAt: new Date().toISOString(),
          resolvedBy: userId
        });
        
        // If HIDE, set the target as inactive (soft delete)
        if (action === 'HIDE') {
           const targetSnap = await t.get(targetRef);
           if (targetSnap.exists) {
             t.update(targetRef, { active: false });
           }
        }
      });

      res.json({ success: true });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal error" });
    }
  });

  app.post("/api/admin/sync-public-profiles", async (req, res) => {
    try {
      if (!admin.getApps().length) return res.status(500).json({ error: "Firebase Admin not configured" });
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const db = getFirestore();
      
      const adminProfile = await db.collection('profiles').doc(userId).get();
      if (!adminProfile.exists || !['ADMIN', 'SUPER_ADMIN'].includes(adminProfile.data()?.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const profilesSnap = await db.collection('profiles').get();
      
      // We will execute in chunks of 400 for safety, though we probably have <400 users
      const chunks = [];
      let currentChunk = [];
      profilesSnap.docs.forEach(doc => {
         currentChunk.push(doc);
         if (currentChunk.length === 400) {
            chunks.push(currentChunk);
            currentChunk = [];
         }
      });
      if (currentChunk.length > 0) chunks.push(currentChunk);
      
      let count = 0;
      for (const chunk of chunks) {
         const batch = db.batch();
         for (const doc of chunk) {
            const p = doc.data();
            const points = p.points || 0;
            let levelOrder = 1;
            const LEVELS = [
              { name: 'SIGNAL', order: 1, threshold: 0 },
              { name: 'AWARE', order: 2, threshold: 1000 },
              { name: 'SEEKER', order: 3, threshold: 3000 },
              { name: 'INNER', order: 4, threshold: 10000 }
            ];
            for (const l of [...LEVELS].reverse()) {
              if (points >= l.threshold) {
                levelOrder = l.order;
                break;
              }
            }
            
            const publicData = {
              userId: doc.id,
              username: p.username || 'anon',
              pupaId: p.pupaId || '',
              avatar: p.avatar || null,
              displayName: p.displayName || '',
              level: levelOrder,
              publicTrophies: (p.trophies || []).map((t: any) => t.trophyId),
              publicDrops: [], 
              rankingPoints: points,
              updatedAt: new Date().toISOString()
            };
            
            batch.set(db.collection('publicProfiles').doc(doc.id), publicData, { merge: true });
            count++;
         }
         await batch.commit();
      }
      
      res.json({ message: `Synced ${count} profiles.` });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/rewards/redeem", async (req, res) => {
    try {
      if (!admin.getApps().length) return res.status(500).json({ error: "Firebase Admin not configured" });

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      
      const { rewardId, idempotencyKey } = req.body;
      if (!rewardId || !idempotencyKey) return res.status(400).json({ error: "Missing required fields" });
      
      const db = getFirestore();
      
      let redemptionData = null;
      let newBalance = 0;
      
      await db.runTransaction(async (t) => {
          // 1. Idempotency Check
          const idempotencyQuery = db.collection('redemptions').where('idempotencyKey', '==', idempotencyKey).limit(1);
          const existingRedemption = await t.get(idempotencyQuery);
          if (!existingRedemption.empty) {
             throw new Error("IDEMPOTENCY_HIT");
          }
          
          // 2. Fetch Reward
          const rewardRef = db.collection('rewards').doc(rewardId);
          const rewardSnap = await t.get(rewardRef);
          if (!rewardSnap.exists) throw new Error("Reward not found");
          const reward = rewardSnap.data() as any;
          
          if (!reward.active) throw new Error("Reward is inactive");
          if (!reward.unlimited && (reward.stock || 0) <= 0) throw new Error("Out of stock");
          
          // 3. One-time check
          if (reward.oneTimePerUser) {
             const userRedemptionsQuery = db.collection('redemptions').where('userId', '==', userId).where('rewardId', '==', rewardId).limit(1);
             const userRedemptions = await t.get(userRedemptionsQuery);
             if (!userRedemptions.empty) throw new Error("Already redeemed this one-time reward");
          }
          
          // 4. Fetch Profile & Check balance / level
          const profileRef = db.collection('profiles').doc(userId);
          const profileSnap = await t.get(profileRef);
          if (!profileSnap.exists) throw new Error("Profile not found");
          const profile = profileSnap.data() as any;
          
          const userPoints = profile.points || 0;
          if (userPoints < reward.pointsCost) throw new Error("Insufficient points");
          
          // Check Level
          let levelOrder = 1;
          const LEVELS = [
            { name: 'SIGNAL', order: 1, threshold: 0 },
            { name: 'AWARE', order: 2, threshold: 1000 },
            { name: 'SEEKER', order: 3, threshold: 3000 },
            { name: 'INNER', order: 4, threshold: 10000 }
          ];
          for (const l of [...LEVELS].reverse()) {
            if (userPoints >= l.threshold) {
              levelOrder = l.order;
              break;
            }
          }
          if (reward.requiredLevel && levelOrder < reward.requiredLevel) {
             throw new Error("Level requirement not met");
          }
          
          // 5. Debit points, manage trophies
          const profileUpdates: any = { points: FieldValue.increment(-reward.pointsCost) };
          newBalance = userPoints - reward.pointsCost;
          
          let newLevelOrder = 1;
          for (const l of [...LEVELS].reverse()) {
             if (newBalance >= l.threshold) {
                newLevelOrder = l.order;
                break;
             }
          }
          
          t.set(db.collection('publicProfiles').doc(userId), {
             rankingPoints: newBalance,
             level: newLevelOrder,
             updatedAt: new Date().toISOString()
          }, { merge: true });
          
          if (reward.type === 'TROPHY' && reward.rewardTrophyId) {
             const trophies = profile.trophies || [];
             if (!trophies.find((x: any) => x.trophyId === reward.rewardTrophyId)) {
                trophies.push({ trophyId: reward.rewardTrophyId, unlockedAt: new Date().toISOString() });
                profileUpdates.trophies = trophies;
             }
          }
          t.update(profileRef, profileUpdates);
          
          // 6. Deduct stock if limited
          if (!reward.unlimited) {
             t.update(rewardRef, { stock: FieldValue.increment(-1) });
          }
          
          // 7. Record transaction
          const ptRef = db.collection('pointTransactions').doc();
          t.set(ptRef, {
             id: ptRef.id,
             userId,
             amount: -reward.pointsCost,
             type: 'SPEND',
             source: 'reward_redemption',
             description: `Resgate: ${reward.title}`,
             createdAt: new Date().toISOString()
          });
          
          // 8. Record redemption
          const redRef = db.collection('redemptions').doc();
          redemptionData = {
             id: redRef.id,
             userId,
             rewardId,
             pointsCost: reward.pointsCost,
             status: 'CONFIRMED',
             idempotencyKey,
             createdAt: new Date().toISOString()
          };
          t.set(redRef, redemptionData);
      });
      
      res.json({ success: true, redemption: redemptionData, newBalance });
    } catch (error: any) {
      if (error.message === "IDEMPOTENCY_HIT") {
         return res.json({ success: true, cached: true });
      }
      console.error("Redeem Error:", error);
      res.status(400).json({ error: error.message || "Failed to redeem" });
    }
  });

  // SECRET CONTENT UNLOCK API
  app.post("/api/unlock", async (req, res) => {
    try {
      if (!admin.getApps().length) return res.status(500).json({ error: "Firebase Admin not configured" });

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      
      const { contentId } = req.body;
      if (!contentId) return res.status(400).json({ error: "Missing contentId" });
      
      const db = getFirestore();
      
      // Get the secret content
      const contentSnap = await db.collection('secretContent').doc(contentId).get();
      if (!contentSnap.exists) return res.status(404).json({ error: "Content not found" });
      const content = contentSnap.data() as any;
      
      // Get user profile to check requirements
      const profileSnap = await db.collection('profiles').doc(userId).get();
      if (!profileSnap.exists) return res.status(404).json({ error: "Profile not found" });
      const profile = profileSnap.data() as any;
      
      const userPoints = profile.points || 0;
      
      // Level calculation logic based on points (same as frontend)
      let levelOrder = 1;
      const LEVELS = [
        { name: 'SIGNAL', order: 1, threshold: 0 },
        { name: 'AWARE', order: 2, threshold: 1000 },
        { name: 'SEEKER', order: 3, threshold: 3000 },
        { name: 'INNER', order: 4, threshold: 10000 }
      ];
      for (const l of [...LEVELS].reverse()) {
        if (userPoints >= l.threshold) {
          levelOrder = l.order;
          break;
        }
      }
      
      if (content.requiredPoints && userPoints < content.requiredPoints) {
         return res.status(403).json({ error: "Not enough points" });
      }
      
      if (content.requiredLevel && levelOrder < content.requiredLevel) {
         return res.status(403).json({ error: "Level too low" });
      }
      
      await db.runTransaction(async (t) => {
          // Idempotency: Check if already unlocked
          const unlockQuery = await db.collection('userUnlocks')
             .where('userId', '==', userId)
             .where('contentId', '==', contentId)
             .limit(1).get();
             
          if (!unlockQuery.empty) return; // already unlocked
          
          const unlockRef = db.collection('userUnlocks').doc();
          t.set(unlockRef, {
             id: unlockRef.id,
             userId,
             contentId,
             unlockedAt: new Date().toISOString()
          });
          
          if (content.rewardTrophyId) {
             const pSnap = await t.get(db.collection('profiles').doc(userId));
             const pData = pSnap.data() || {};
             const trophies = pData.trophies || [];
             if (!trophies.find((x: any) => x.trophyId === content.rewardTrophyId)) {
                trophies.push({ trophyId: content.rewardTrophyId, unlockedAt: new Date().toISOString() });
                t.update(db.collection('profiles').doc(userId), { trophies });
             }
          }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unlock Error:", error);
      res.status(500).json({ error: error.message || "Failed to unlock" });
    }
  });

  // WEBHOOK API
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const { type, data, action } = req.body;
      if (!admin.getApps().length) return res.status(500).send("No admin");
      
      const mpSecret = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
        const paymentId = data?.id;
        if (!paymentId) return res.status(400).send("No payment ID");

        let paymentStatusStr = '';
        if (mpSecret) {
          const client = new MercadoPagoConfig({ accessToken: mpSecret });
          const payment = new Payment(client);
          const paymentData = await payment.get({ id: paymentId });
          paymentStatusStr = paymentData.status || '';
        } else {
           if (req.query.testApprove === 'true') paymentStatusStr = 'approved';
           else if (req.query.testCancel === 'true') paymentStatusStr = 'cancelled';
        }

        const db = getFirestore();
        const ordersSnap = await db.collection('orders').where('paymentId', '==', paymentId.toString()).limit(1).get();
        
        if (!ordersSnap.empty) {
          const orderDoc = ordersSnap.docs[0];
          
          await db.runTransaction(async (t) => {
             const orderSnap = await t.get(orderDoc.ref);
             if (!orderSnap.exists) return;
             const order = orderSnap.data() as any;
             
             if (paymentStatusStr === 'approved') {
               if (order.paymentStatus === 'PAGO') return; 
               
               t.update(orderDoc.ref, { 
                  paymentStatus: 'PAGO', 
                  status: 'PAGAMENTO APROVADO', 
                  updatedAt: new Date().toISOString() 
               });
               
               const pointsToAward = Math.floor(order.total * 10);
               const profileRef = db.collection('profiles').doc(order.userId);
               const ptRef = db.collection('pointTransactions').doc();
               
               const pSnap = await t.get(profileRef);
               const pData = pSnap.data() || {};
               const userTrophies = pData.trophies || [];
               
               let updatedTrophies = false;
               if (!userTrophies.find((x: any) => x.trophyId === 'first_purchase')) {
                  userTrophies.push({ trophyId: 'first_purchase', unlockedAt: new Date().toISOString() });
                  updatedTrophies = true;
               }
               if (!userTrophies.find((x: any) => x.trophyId === 'first_drop')) {
                  userTrophies.push({ trophyId: 'first_drop', unlockedAt: new Date().toISOString() });
                  updatedTrophies = true;
               }
               
               const profileUpdates: any = { points: FieldValue.increment(pointsToAward) };
               if (updatedTrophies) profileUpdates.trophies = userTrophies;
               
               const currentPoints = pData.points || 0;
               const newPoints = currentPoints + pointsToAward;
               let newLevelOrder = 1;
               const LEVELS = [
                 { name: 'SIGNAL', order: 1, threshold: 0 },
                 { name: 'AWARE', order: 2, threshold: 1000 },
                 { name: 'SEEKER', order: 3, threshold: 3000 },
                 { name: 'INNER', order: 4, threshold: 10000 }
               ];
               for (const l of [...LEVELS].reverse()) {
                 if (newPoints >= l.threshold) {
                   newLevelOrder = l.order;
                   break;
                 }
               }
               t.set(db.collection('publicProfiles').doc(order.userId), {
                  rankingPoints: newPoints,
                  level: newLevelOrder,
                  updatedAt: new Date().toISOString()
               }, { merge: true });
               
               t.update(profileRef, profileUpdates);
               t.set(ptRef, {
                 id: ptRef.id,
                 userId: order.userId,
                 orderId: order.id,
                 amount: pointsToAward,
                 type: 'PURCHASE',
                 source: 'store_order',
                 description: `PUPA POINTS por pedido ${order.publicOrderCode}`,
                 createdAt: new Date().toISOString()
               });
               console.log(`Pedido ${order.publicOrderCode} pago com sucesso e ${pointsToAward} pontos gerados.`);
               
             } else if (paymentStatusStr === 'cancelled' || paymentStatusStr === 'rejected' || paymentStatusStr === 'refunded') {
               if (order.paymentStatus === 'CANCELADO' || order.status === 'CANCELADO') return;
               
               // Restore Stock
               if (order.items && Array.isArray(order.items)) {
                  for (const item of order.items) {
                    const variantRef = db.collection('productVariants').doc(item.variantId);
                    t.update(variantRef, { stock: FieldValue.increment(item.quantity) });
                  }
               }

               t.update(orderDoc.ref, {
                 paymentStatus: 'CANCELADO',
                 status: 'CANCELADO', 
                 updatedAt: new Date().toISOString()
               });
               console.log(`Pedido ${order.publicOrderCode} cancelado. Estoque devolvido.`);
             }
          });
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error", error);
      res.status(500).send("Webhook error");
    }
  });

  app.post("/api/test_mp", async (req, res) => { 
    try { 
      const provider = process.env.PAYMENT_PROVIDER; 
      const mpEnv = process.env.MERCADOPAGO_ENVIRONMENT; 
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN; 
      if (!token) return res.json({ error: "No token" }); 
      const { MercadoPagoConfig, Payment } = require("mercadopago"); 
      const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 5000 } }); 
      const payment = new Payment(client); 
      const mpResponse = await payment.create({ 
        body: { 
          transaction_amount: 129.90, 
          description: "TEST", 
          payment_method_id: "pix", 
          payer: { email: "test@test.com", identification: { type: "CPF", number: "12345678909" } } 
        } 
      }); 
      res.json({ provider, mpEnv, id: mpResponse.id, qr: !!mpResponse.point_of_interaction?.transaction_data?.qr_code, qrBase64: !!mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 }); 
    } catch(e: any) { res.json({ error: e.message }); } 
  });
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Fallback to index.html for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
