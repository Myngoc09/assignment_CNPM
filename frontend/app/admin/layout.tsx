import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <AdminSidebar />

      <div className="min-h-screen min-w-0 pl-64">
        {children}
      </div>
    </div>
  );
}