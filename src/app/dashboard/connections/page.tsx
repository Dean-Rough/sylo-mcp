export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Service Connections</h2>
        <p className="text-gray-600 mt-2">Manage your OAuth connections to productivity services</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Services</h3>
          <p className="text-gray-600 mb-6">
            Connect your productivity tools to enable AI agent access with zero credential exposure
          </p>

          <div className="space-y-4">
            {['Gmail', 'Asana', 'Xero'].map(service => (
              <div
                key={service}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">{service[0]}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{service}</h4>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
