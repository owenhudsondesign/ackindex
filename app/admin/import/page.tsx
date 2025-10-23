'use client'

import { useState } from 'react'

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadStatus('Uploading files...')

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData()
        formData.append('file', file)
        formData.append('municipality', 'Nantucket, MA')
        formData.append('year', '2024')

        const response = await fetch('/api/parse-budget', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const result = await response.json()
        if (result.success) {
          setUploadStatus(`✅ Successfully processed ${file.name} - Budget ID: ${result.budgetId}`)
          setUploadedFiles(prev => [...prev, file.name])
        } else {
          setUploadStatus(`❌ Error processing ${file.name}: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray">Admin: Import Budget Documents</h1>
          <a 
            href="/admin/logout"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Logout
          </a>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-brand">
            <h2 className="text-xl font-semibold mb-4 text-dark-gray">Upload Budget PDFs</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="file-upload" className="block text-sm font-medium mb-2 text-dark-gray">
                  Select Budget Files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              
              {uploadStatus && (
                <div className={`p-3 rounded-md ${
                  uploadStatus.includes('Successfully') 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : uploadStatus.includes('Error')
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  <p className="text-sm font-medium">{uploadStatus}</p>
                </div>
              )}
              
              <div className="text-sm text-dark-gray/70">
                <p>Supported formats: PDF</p>
                <p>Files will be automatically parsed and stored in the database.</p>
              </div>
            </div>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow-brand">
              <h3 className="text-lg font-semibold mb-4 text-dark-gray">Successfully Uploaded Files</h3>
              <div className="space-y-2">
                {uploadedFiles.map((filename, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <span className="text-green-600">✅</span>
                    <span>{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8 bg-white p-6 rounded-lg shadow-brand">
            <h3 className="text-lg font-semibold mb-4 text-dark-gray">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-dark-gray/70">
              <li>Select one or more budget PDF files</li>
              <li>Files will be automatically uploaded and processed</li>
              <li>AI will extract budget categories and line items</li>
              <li>Data will be stored in the Supabase database</li>
              <li>You can view the results in the admin panel</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}