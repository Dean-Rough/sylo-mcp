export default function OAuthCallbackPage({ params }: { params: { service: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing {params.service} connection...</h1>
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  )
}
