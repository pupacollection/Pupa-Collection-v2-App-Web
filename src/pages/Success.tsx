import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Order } from '../types';

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Real-time listener for order updates
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder(docSnap.data() as Order);
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  const handleCopy = () => {
    if (order?.paymentDetails?.qrCode) {
      navigator.clipboard.writeText(order.paymentDetails.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!order) {
    return (
      <div className="w-full min-h-[calc(100vh-160px)] flex items-center justify-center px-6 pt-12 md:pt-20">
        <div className="text-white font-heading tracking-widest text-sm animate-pulse uppercase">CARREGANDO PEDIDO...</div>
      </div>
    );
  }

  const isPendingPix = order.paymentProvider === 'MERCADO_PAGO' && order.paymentStatus === 'AGUARDANDO PAGAMENTO';

  return (
    <div className="w-full min-h-[calc(100vh-160px)] flex items-center justify-center px-6 pt-12 md:pt-20 pb-20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-pupa-dark-gray border border-white/5 p-8 md:p-12 text-center flex flex-col items-center"
      >
        {isPendingPix ? (
           <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6">
             <Clock className="w-8 h-8 text-yellow-500" />
           </div>
        ) : (
           <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
             <CheckCircle2 className="w-8 h-8 text-green-500" />
           </div>
        )}
        
        <h1 className="text-2xl font-heading font-bold text-white tracking-widest mb-2 uppercase">
          {isPendingPix ? 'AGUARDANDO PAGAMENTO' : 'PEDIDO CONFIRMADO'}
        </h1>
        <p className="text-[10px] text-gray-500 font-heading tracking-widest uppercase mb-8">
          {isPendingPix ? 'FINALIZE VIA PIX PARA GARANTIR' : 'PUPA // DROP 001'}
        </p>
        
        <div className="bg-pupa-graphite border border-white/5 p-4 mb-8 w-full flex justify-between items-center text-left">
          <div>
            <span className="text-[10px] font-heading tracking-widest text-gray-400 block mb-1 uppercase">ID DO PEDIDO</span>
            <span className="font-body text-white font-bold uppercase">{order.publicOrderCode || order.id}</span>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-heading tracking-widest text-gray-400 block mb-1 uppercase">TOTAL</span>
             <span className="font-body text-white font-bold uppercase">R$ {order.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {isPendingPix && order.paymentDetails?.qrCodeBase64 && (
          <div className="w-full bg-white p-4 mb-6 flex justify-center items-center rounded-sm">
             <img src={`data:image/jpeg;base64,${order.paymentDetails.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48 object-contain mix-blend-multiply" />
          </div>
        )}

        {isPendingPix && order.paymentDetails?.qrCode && (
           <div className="w-full mb-8">
              <button onClick={handleCopy} className="w-full border border-white/20 bg-transparent text-white font-heading font-bold tracking-widest py-4 flex justify-center items-center gap-2 hover:bg-white/5 transition-colors uppercase text-[11px] md:text-sm">
                <Copy className="w-4 h-4" />
                {copied ? 'CÓDIGO COPIADO!' : 'COPIAR CÓDIGO PIX'}
              </button>
           </div>
        )}

        {isPendingPix && (
          <div className="text-[10px] text-gray-500 font-heading tracking-widest mt-2 mb-8 uppercase">
             A página atualizará automaticamente após o pagamento.
          </div>
        )}

        {!isPendingPix && (
          <div className="border border-pupa-neon/20 bg-pupa-neon/5 px-6 py-4 mb-10 w-full flex flex-col items-center">
            <span className="text-[10px] font-heading tracking-widest text-pupa-neon mb-1 uppercase">RECOMPENSA DE DESBLOQUEIO</span>
            <span className="text-lg font-heading font-bold text-pupa-neon uppercase">+{Math.floor(order.total * 10)} PUPA POINTS</span>
          </div>
        )}
        
        <div className="flex flex-col w-full gap-4">
          <Link to={`/account/orders`} className="w-full bg-white text-black font-heading font-bold tracking-widest py-4 hover:bg-gray-200 transition-colors uppercase text-sm">
            VER MEUS PEDIDOS
          </Link>
          <Link to="/store" className="w-full bg-transparent border border-white/20 text-white font-heading font-bold tracking-widest py-4 hover:bg-white/5 transition-colors uppercase text-sm">
            CONTINUAR EXPLORANDO
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
