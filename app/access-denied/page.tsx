import Link from "next/link";
export default function AccessDenied() {
  return <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
    <div className="max-w-lg text-center">
      <h1 className="text-3xl font-bold">Access restricted</h1>
      <p className="mt-4 text-gray-400">
        Your email address is not currently included in the approved signup
        domains or email whitelist. Contact the application administrator.
      </p>
      <Link href="/" className="mt-6 inline-block text-purple-400 underline">Back to sign in</Link>
    </div>
  </main>;
}
