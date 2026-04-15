export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ocean text-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Review Moderation</h1>
        <a href="/" className="text-white/60 hover:text-white text-sm transition-colors">
          ← Back to app
        </a>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
