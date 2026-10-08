import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './helpers/AuthContent';
import AppRoutes from './helpers/AppRoutes';
import Sidebar from './components/sidebar/Sidebar';
import '../index.css';

function ErrorFallback({ error, resetErrorBoundary }) {
  const showDiagnosticDetails = import.meta.env.DEV && error?.message;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6 text-center"
      role="alert"
    >
      <h1 className="text-4xl font-bold mb-4">
        Something went wrong
      </h1>

      <p className="text-lg mb-8 text-gray-400">
        We could not load this part of SocialPredict.
      </p>

      {showDiagnosticDetails && (
        <details className="mb-8 max-w-2xl text-left">
          <summary className="cursor-pointer text-sm text-gray-400">
            Development error details
          </summary>

          <pre className="mt-3 overflow-auto rounded-lg bg-gray-900 border border-gray-800 p-4 text-sm text-gray-300">
            {error.message}
          </pre>
        </details>
      )}

      <button
        onClick={resetErrorBoundary}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#f7f7f8] text-[#111111]">

            <div className="flex min-h-screen">

              <Sidebar />

              <main className="flex-1 min-w-0">
                <AppRoutes />
              </main>

            </div>

          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;