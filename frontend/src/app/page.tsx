export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold mb-4">A-Deal</h1>
      <p className="text-xl text-gray-400 mb-8 text-center max-w-lg">
        An AI-powered marketplace where Claude agents negotiate and close deals on your behalf.
      </p>
      <div className="flex gap-4">
        <a
          href="/register"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          Get Started
        </a>
        <a
          href="/marketplace"
          className="border border-gray-600 hover:border-gray-400 px-6 py-3 rounded-lg font-semibold transition"
        >
          View Marketplace
        </a>
      </div>
    </main>
  );
}
