import 'dotenv/config';

console.log('PAYMENT_PROVIDER=', process.env.PAYMENT_PROVIDER);
console.log('MERCADOPAGO_ENVIRONMENT=', process.env.MERCADOPAGO_ENVIRONMENT);
console.log('MERCADOPAGO_ACCESS_TOKEN exists:', !!process.env.MERCADOPAGO_ACCESS_TOKEN);

