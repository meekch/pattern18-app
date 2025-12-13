export const metadata = {
  title: "Pattern 18 Coach",
  description: "Your 24/7 strategic partner for high-conflict co-parenting. Be prepared. Be empowered. Take back control.",
};

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      {children}
    </div>
  );
}