import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-primary-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Annual Wellness Visit</h1>
        </div>
      </header>
      
      <section className="flex-grow flex items-center">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Welcome to the Annual Wellness Visit Platform</h2>
            <p className="text-xl mb-8">
              A comprehensive solution for healthcare providers to conduct Annual Wellness Visits, 
              manage patients, and generate personalized health plans.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/login"
                className="btn-primary text-center text-lg font-medium"
              >
                Login
              </Link>
              <Link 
                href="/dashboard"
                className="btn-secondary text-center text-lg font-medium"
              >
                Dashboard Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="bg-gray-100 p-4">
        <div className="container mx-auto text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Annual Wellness Visit Platform</p>
        </div>
      </footer>
    </main>
  );
} 