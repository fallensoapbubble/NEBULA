
"use client";

export default function Home() {
  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          background: url('https://giffiles.alphacoders.com/141/14130.gif') center center / cover no-repeat fixed;
          font-family: sans-serif;
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        textShadow: '0 2px 8px #000'
      }}>
        <h1>Welcome to Nebula</h1>
        <p>Your cosmic portfolio homepage</p>
      </div>
    </>
  );
}
