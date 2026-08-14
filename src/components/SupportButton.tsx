// Direct Stripe Payment Links. No API calls, just works
const PAYMENT_LINKS: Record<number, string> = {
  1: 'https://buy.stripe.com/aFaeVebd6eewefb36K6sw03',
  5: 'https://buy.stripe.com/28E28s4OI0nG1sp22G6sw04',
  10: 'https://buy.stripe.com/cNibJ20ys2vO8URgXA6sw05',
  25: 'https://buy.stripe.com/6oU5kE1Cw2vO0olazc6sw06',
};

interface SupportButtonProps {
  amount: number;
}

export default function SupportButton({ amount }: SupportButtonProps) {
  const url = PAYMENT_LINKS[amount] || PAYMENT_LINKS[1];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="amount-button"
      aria-label={`Support with ${amount} dollar${amount === 1 ? '' : 's'} per month`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      ${amount}
      <span className="amount-label">/mo</span>
    </a>
  );
}
