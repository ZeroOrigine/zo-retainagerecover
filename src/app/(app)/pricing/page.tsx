import PricingTable from '@/components/PricingTable';

export const metadata = {
  title: 'Pricing',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          Start free and upgrade as you grow. No hidden fees.
        </p>
      </div>

      <div className="mt-16">
        <PricingTable />
      </div>
    </div>
  );
}
