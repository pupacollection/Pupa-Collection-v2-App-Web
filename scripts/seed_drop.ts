import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read config
import fs from 'fs';
const configPath = './firebase-applet-config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!getApps().length) {
   initializeApp({ projectId: config.projectId });
}

const db = getFirestore();
db.settings({ databaseId: config.firestoreDatabaseId || '(default)' });

async function seed() {
  const dropsRef = db.collection('drops');
  const snap = await dropsRef.where('slug', '==', 'drop-001').get();
  
  let dropId = '';
  
  if (snap.empty) {
     const newRef = dropsRef.doc();
     dropId = newRef.id;
     await newRef.set({
       id: dropId,
       slug: 'drop-001',
       name: 'DROP 001',
       title: 'PUPA ESSENTIAL',
       description: 'A fundação da cultura PUPA. O essencial elevado à máxima potência.',
       manifesto: 'MAIS QUE ROUPA.\nUMA CULTURA EM MOVIMENTO.\n\nO DROP 001 marca o início. Não é sobre vestir, é sobre pertencer. O Off-Black e o Off-White representam a dualidade do universo. Entre para o movimento.',
       heroImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop',
       coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop',
       status: 'DISPONÍVEL',
       countdownEnabled: false,
       featured: true,
       limited: true,
       noRestock: true,
       products: [],
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     });
     console.log('DROP 001 created.');
  } else {
     dropId = snap.docs[0].id;
     console.log('DROP 001 already exists.');
  }

  // Create products for Drop 001
  const prods = [
    {
      name: 'PUPA ESSENTIAL - Oversized T-Shirt (Off-Black)',
      slug: 'pupa-essential-oversized-off-black',
      description: 'A camiseta Oversized oficial da fundação PUPA.',
      price: 149.90,
      promoPrice: 129.90,
      collection: 'PUPA ESSENTIAL',
      dropId: dropId,
      badge: 'LIMITED',
      featured: true,
      active: true,
    },
    {
      name: 'PUPA ESSENTIAL - Oversized T-Shirt (Off-White)',
      slug: 'pupa-essential-oversized-off-white',
      description: 'A camiseta Oversized oficial da fundação PUPA.',
      price: 149.90,
      promoPrice: 129.90,
      collection: 'PUPA ESSENTIAL',
      dropId: dropId,
      badge: 'LIMITED',
      featured: true,
      active: true,
    }
  ];

  const productIds = [];

  for (const p of prods) {
     const pSnap = await db.collection('products').where('slug', '==', p.slug).get();
     let pId = '';
     if (pSnap.empty) {
        const pRef = db.collection('products').doc();
        pId = pRef.id;
        await pRef.set({ ...p, id: pId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        
        // create variants
        const sizes = ['M', 'G', 'GG'];
        for (const s of sizes) {
           const vRef = db.collection('productVariants').doc();
           await vRef.set({
              id: vRef.id,
              productId: pId,
              color: p.slug.includes('black') ? 'OFF-BLACK' : 'OFF-WHITE',
              size: s,
              sku: `PUPA-001-\${p.slug.includes('black') ? 'BLK' : 'WHT'}-\${s}`,
              stock: Math.floor(Math.random() * 10) + 2, // Not inventing stock usually, but we need initial db seed for it to exist!
              active: true
           });
        }
        console.log(`Product \${p.name} created.`);
     } else {
        pId = pSnap.docs[0].id;
        // update dropId if needed
        await pSnap.docs[0].ref.update({ dropId, promoPrice: p.promoPrice, price: p.price });
     }
     productIds.push(pId);
  }

  // update drop with products
  await db.collection('drops').doc(dropId).update({ products: productIds });

  // Create Secret Content
  const scSnap = await db.collection('secretContent').where('dropId', '==', dropId).get();
  if (scSnap.empty) {
     const scRef = db.collection('secretContent').doc();
     await scRef.set({
        id: scRef.id,
        title: 'TRANSMISSÃO #001',
        description: 'Bem-vindo ao núcleo. O primeiro passo da revolução PUPA.\n\nEste fragmento de conteúdo é restrito para os primeiros membros do movimento.',
        requiredLevel: 0,
        requiredPoints: 1299,
        dropId: dropId,
        active: true,
        assetUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'
     });
     console.log('Secret Content created.');
  }

  console.log('Seed completed.');
}

seed().catch(console.error);
