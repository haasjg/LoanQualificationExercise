function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Path to Yes</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Content area for components */}
        <div className="space-y-6">
          {/* Rate Benchmark Badge will be placed here */}
          {/* Applicant Input Panel will be placed here */}
          {/* Decision Banner will be placed here */}
          {/* Path To Yes Checklist will be placed here */}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Path to Yes. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
