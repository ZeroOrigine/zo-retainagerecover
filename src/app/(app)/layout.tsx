import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeedbackWidget from '@/components/FeedbackWidget';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#fff', color: '#111827' }}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FeedbackWidget />
    </div>
  );
}
