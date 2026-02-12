export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-lyght-white flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
}
