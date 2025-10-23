export interface NantucketProject {
  id: string
  permitNumber: string
  description: string
  address: string
  type: string
  status: string
  priority: string
  budget?: number
  communityImpact: string
  submittedDate: string
}

export async function scrapeNantucketData(): Promise<NantucketProject[]> {
  try {
    // For deployment, we'll return sample data that represents real Nantucket projects
    // In production, this would be replaced with actual web scraping
    
    const sampleProjects: NantucketProject[] = [
      {
        id: '1',
        permitNumber: 'BP-2024-001',
        description: 'Residential Addition - Single Family Home',
        address: '45 Main Street, Nantucket, MA',
        type: 'Residential Construction',
        status: 'Active',
        priority: 'Medium',
        budget: 250000,
        communityImpact: 'Low',
        submittedDate: '2024-01-15'
      },
      {
        id: '2',
        permitNumber: 'BP-2024-002',
        description: 'Commercial Renovation - Historic Building',
        address: '12 Broad Street, Nantucket, MA',
        type: 'Commercial Renovation',
        status: 'In Progress',
        priority: 'High',
        budget: 750000,
        communityImpact: 'High',
        submittedDate: '2024-01-20'
      },
      {
        id: '3',
        permitNumber: 'BP-2024-003',
        description: 'Infrastructure Improvement - Road Repair',
        address: 'Various Locations, Nantucket, MA',
        type: 'Infrastructure',
        status: 'Active',
        priority: 'High',
        budget: 1200000,
        communityImpact: 'High',
        submittedDate: '2024-01-25'
      },
      {
        id: '4',
        permitNumber: 'BP-2024-004',
        description: 'Environmental Restoration Project',
        address: 'Conservation Areas, Nantucket, MA',
        type: 'Environmental',
        status: 'Planning',
        priority: 'Medium',
        budget: 500000,
        communityImpact: 'Medium',
        submittedDate: '2024-02-01'
      },
      {
        id: '5',
        permitNumber: 'BP-2024-005',
        description: 'Public Facility Upgrade - Library',
        address: '1 India Street, Nantucket, MA',
        type: 'Public Facility',
        status: 'Approved',
        priority: 'Medium',
        budget: 400000,
        communityImpact: 'Medium',
        submittedDate: '2024-02-05'
      }
    ]

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`Returning ${sampleProjects.length} sample projects for deployment`)
    return sampleProjects
    
  } catch (error) {
    console.error('Error in simple scraper:', error)
    return []
  }
}