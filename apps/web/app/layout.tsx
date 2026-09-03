import './globals.css';
import AuthBootstrap from './auth-bootstrap';

export const metadata = {
  title: 'Abbas AI App Factory',
  description: 'AI-first app and content automation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl"><body><AuthBootstrap />{children}</body></html>;
}
