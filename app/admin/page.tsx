import Link from 'next/link'
import { motion } from 'framer-motion'
import { Upload, Eye, Users } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray mb-4">
            Admin Panel
          </h1>
          <p className="text-lg text-dark-gray/70">
            Manage budgets, upload documents, and configure analysis settings
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link 
              href="/admin/import"
              className="block bg-white p-6 rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                <Upload className="h-8 w-8 text-brand-blue mr-3" />
                <h2 className="text-xl font-semibold text-dark-gray">Import Budgets</h2>
              </div>
              <p className="text-dark-gray/70">
                Upload and parse budget PDF documents with AI-powered analysis
              </p>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link 
              href="/admin/budgets"
              className="block bg-white p-6 rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                <Eye className="h-8 w-8 text-brand-blue mr-3" />
                <h2 className="text-xl font-semibold text-dark-gray">View Budgets</h2>
              </div>
              <p className="text-dark-gray/70">
                Browse and analyze uploaded budgets with detailed insights
              </p>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-brand"
          >
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-brand-blue mr-3" />
              <h2 className="text-xl font-semibold text-dark-gray">Subscriptions</h2>
            </div>
            <p className="text-dark-gray/70">
              Manage user subscriptions and notifications
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
