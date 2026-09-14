import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, query, where, initializeFirestore } from 'firebase/firestore';
import fs from 'fs';

const configPath = './firebase-applet-config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

async function seed() {
  const dropsRef = collection(db, 'drops');
  const snap = await getDocs(query(dropsRef, where('slug', '==', 'drop-001')));
  
  let dropId = '';
  
  if (snap.empty) {
     const newRef = doc(dropsRef);
     dropId = newRef.id;
     await setDoc(newRef, {
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
     const pSnap = await getDocs(query(collection(db, 'products'), where('slug', '==', p.slug)));
     let pId = '';
     if (pSnap.empty) {
        const pRef = doc(collection(db, 'products'));
        pId = pRef.id;
        await setDoc(pRef, { ...p, id: pId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        
        const sizes = ['M', 'G', 'GG'];
        for (const s of sizes) {
           const vRef = doc(collection(db, 'productVariants'));
           await setDoc(vRef, {
              id: vRef.id,
              productId: pId,
              color: p.slug.includes('black') ? 'OFF-BLACK' : 'OFF-WHITE',
              size: s,
              sku: 'PUPA-001-' + (p.slug.includes('black') ? 'BLK' : 'WHT') + '-' + s,
              stock: Math.floor(Math.random() * 10) + 2,
              active: true
           });
        }
        console.log('Product ' + p.name + ' created.');
     } else {
        pId = pSnap.docs[0].id;
        await setDoc(pSnap.docs[0].ref, { ...pSnap.docs[0].data(), dropId, promoPrice: p.promoPrice, price: p.price }, { merge: true });
     }
     productIds.push(pId);
  }

  await setDoc(doc(db, 'drops', dropId), { products: productIds }, { merge: true });

  const scSnap = await getDocs(query(collection(db, 'secretContent'), where('dropId', '==', dropId)));
  if (scSnap.empty) {
     const scRef = doc(collection(db, 'secretContent'));
     await setDoc(scRef, {
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
  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
