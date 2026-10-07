const PUBLICATION_AMOUNT_CENTS = 490;
function publicationConfig() {
  return { amountCents: PUBLICATION_AMOUNT_CENTS, currency: 'PEN',
    yapePhone: process.env.YAPE_PHONE || '', yapeName: process.env.YAPE_NAME || '',
    enabled: Boolean(process.env.YAPE_PHONE && process.env.YAPE_NAME) };
}
module.exports = { PUBLICATION_AMOUNT_CENTS, publicationConfig };
