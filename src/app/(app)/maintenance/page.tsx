export const metadata = {
  title: 'Maintenance',
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          We&apos;ll be right back
        </h1>
        <p className="mx-auto mt-4 max-w-md text-gray-600">
          We&apos;re performing scheduled maintenance to improve your
          experience. Please check back in a few minutes.
        </p>
        <p className="mt-8 text-sm text-gray-400">
          If this persists, contact{' '}
          <a
            href="mailto:support@zeroorigine.com"
            className="underline hover:text-gray-600"
          >
            support@zeroorigine.com
          </a>
        </p>
      </div>
    </div>
  );
}
