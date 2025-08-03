import "./globals.css";



export const metadata = {
  title: "Nebula",
  description: "Decentarlized Portfolio One Stop",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
      >
        {children}
      </body>
    </html>
  );
}
