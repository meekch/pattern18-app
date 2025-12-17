export const metadata = {
  title: "Pattern 18 Coach",
  description: "Your 24/7 strategic partner for high-conflict co-parenting. Be prepared. Be empowered. Take back control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}