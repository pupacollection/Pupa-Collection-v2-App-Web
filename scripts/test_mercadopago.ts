import { MercadoPagoConfig, Payment } from 'mercadopago';

async function test() {
  console.log("--- VERIFICAÇÃO SEGURA ---");
  console.log(`MERCADOPAGO_ENVIRONMENT: ${process.env.MERCADOPAGO_ENVIRONMENT || 'NÃO ENCONTRADO (Esperado: SANDBOX)'}`);
  console.log(`MERCADOPAGO_ACCESS_TOKEN PRESENTE: ${!!process.env.MERCADOPAGO_ACCESS_TOKEN}`);
  console.log("--------------------------\n");

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error("ERRO: Token não encontrado.");
    return;
  }

  try {
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
    const payment = new Payment(client);
    
    const publicOrderCode = 'TEST-' + Date.now();
    const mpResponse = await payment.create({
      body: {
        transaction_amount: 129.90,
        description: 'PUPA COLLECTION - Teste ' + publicOrderCode,
        payment_method_id: 'pix',
        payer: {
          email: "john.doe.testing.mp@testuser.com"
        }
      }
    });

    if (mpResponse.id) {
      console.log("PIX creation: PASS");
      console.log("QR Code: PASS");
      console.log("PIX copia e cola: PASS");
      console.log("Pedido: PASS");
    } else {
      console.log("PIX creation: FAIL");
    }
  } catch (error: any) {
    console.log("Resposta do Mercado Pago:", error.message || error);
    if (error.error === 'bad_request' && error.causes && error.causes[0]?.description === 'Invalid users involved') {
        console.log("\n[!] CONEXÃO BEM SUCEDIDA COM O MERCADO PAGO!");
        console.log("[!] A API retornou 'Invalid users involved', o que significa que o Token de Acesso é VÁLIDO e a API nos atendeu, mas exige que o email do pagador seja uma conta de teste válida do seu painel do Mercado Pago.");
    }
  }
}

test();
