export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">MCP Configuration</h2>
        <p className="text-gray-600 mt-2">
          Generate and manage Model Context Protocol configurations for your AI agents
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Configuration Generator</h3>
          <p className="text-gray-600 mb-6">
            Create standards-compliant MCP configs based on your connected services
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Current Configuration</h4>
              <p className="text-sm text-gray-500 mb-4">No configuration generated yet</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Generate Configuration
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Export Options</h4>
              <div className="flex space-x-2">
                <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors">
                  JSON
                </button>
                <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors">
                  YAML
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
