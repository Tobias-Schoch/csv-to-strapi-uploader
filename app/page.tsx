import { Uploader } from "@/components/uploader"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">CSV to Strapi Uploader</h1>
      <p className="text-gray-600 mb-8">
        Upload CSV files to your Strapi instance with automatic schema detection and column mapping
      </p>
      <Uploader />
    </main>
  )
}
