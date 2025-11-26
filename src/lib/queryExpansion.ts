/**
 * Query Expansion for Civic Domain
 *
 * Expands user queries with synonyms and acronym expansions
 * specific to Nantucket town government context.
 *
 * This improves semantic search recall by ensuring queries match
 * content that uses different terminology for the same concepts.
 */

import logger from './logger';

// =============================================================================
// NANTUCKET-SPECIFIC ACRONYMS (~100+ terms)
// =============================================================================

export const CIVIC_ACRONYMS: Record<string, string> = {
  // Meeting Types
  'ATM': 'Annual Town Meeting',
  'STM': 'Special Town Meeting',
  'TM': 'Town Meeting',

  // Town Boards & Committees
  'CPC': 'Community Preservation Committee',
  'HDC': 'Historic District Commission',
  'ZBA': 'Zoning Board of Appeals',
  'FinCom': 'Finance Committee',
  'ConCom': 'Conservation Commission',
  'NP&EDC': 'Nantucket Planning and Economic Development Commission',
  'NPDC': 'Nantucket Planning and Development Commission',
  'BOH': 'Board of Health',
  'BOS': 'Board of Selectmen',
  'SB': 'Select Board',
  'SC': 'School Committee',
  'ABC': 'Alcoholic Beverage Commission',
  'AHT': 'Affordable Housing Trust',
  'NHT': 'Nantucket Housing Trust',
  'NRTA': 'Nantucket Regional Transit Authority',
  'NHA': 'Nantucket Housing Authority',
  'NHistA': 'Nantucket Historical Association',
  'NCF': 'Nantucket Conservation Foundation',
  'NLT': 'Nantucket Land Trust',
  'NCTV': 'Nantucket Community Television',
  'NAC': 'Nantucket Atheneum',

  // Town Departments
  'DPW': 'Department of Public Works',
  'NPS': 'Nantucket Public Schools',
  'NPD': 'Nantucket Police Department',
  'NFD': 'Nantucket Fire Department',
  'HR': 'Human Resources',
  'IT': 'Information Technology',
  'COA': 'Council on Aging',
  'PLUS': 'Planning Land Use Services',
  'NRD': 'Natural Resources Department',
  'HRD': 'Human Resources Department',
  'MIS': 'Management Information Systems',

  // Massachusetts State Terms
  'MGL': 'Massachusetts General Laws',
  'MEPA': 'Massachusetts Environmental Policy Act',
  'DEP': 'Department of Environmental Protection',
  'DHCD': 'Department of Housing and Community Development',
  'EOHLC': 'Executive Office of Housing and Livable Communities',
  'MassDOT': 'Massachusetts Department of Transportation',
  'MassHousing': 'Massachusetts Housing Finance Agency',
  'CPA': 'Community Preservation Act',
  'MBTA': 'Massachusetts Bay Transportation Authority',
  'DCR': 'Department of Conservation and Recreation',
  'MWRA': 'Massachusetts Water Resources Authority',

  // Legal & Procedural
  'FOIA': 'Freedom of Information Act',
  'PRA': 'Public Records Act',
  'OML': 'Open Meeting Law',
  'RFP': 'Request for Proposal',
  'RFQ': 'Request for Qualifications',
  'IFB': 'Invitation for Bids',
  'MOU': 'Memorandum of Understanding',
  'MOA': 'Memorandum of Agreement',
  'TIF': 'Tax Increment Financing',
  'PILOT': 'Payment in Lieu of Taxes',
  'LIP': 'Local Initiative Program',
  'SHI': 'Subsidized Housing Inventory',
  'Ch40B': 'Chapter 40B',
  '40B': 'Chapter 40B',
  '40R': 'Chapter 40R',
  '40A': 'Chapter 40A',
  '61': 'Chapter 61',
  '61A': 'Chapter 61A',
  '61B': 'Chapter 61B',

  // Zoning & Planning
  'ZBL': 'Zoning Bylaw',
  'SP': 'Special Permit',
  'SUP': 'Special Use Permit',
  'ANR': 'Approval Not Required',
  'OSRD': 'Open Space Residential Development',
  'PUD': 'Planned Unit Development',
  'TOD': 'Transit Oriented Development',
  'ADU': 'Accessory Dwelling Unit',
  'FAR': 'Floor Area Ratio',
  'GFA': 'Gross Floor Area',
  'ROW': 'Right of Way',
  'LUP': 'Land Use Plan',
  'EIR': 'Environmental Impact Report',
  'ENF': 'Environmental Notification Form',
  'NOI': 'Notice of Intent',
  'OOC': 'Order of Conditions',
  'COC': 'Certificate of Compliance',

  // Infrastructure & Utilities
  'WWTF': 'Wastewater Treatment Facility',
  'WTP': 'Water Treatment Plant',
  'SRF': 'State Revolving Fund',
  'CWSRF': 'Clean Water State Revolving Fund',
  'DWSRF': 'Drinking Water State Revolving Fund',
  'MS4': 'Municipal Separate Storm Sewer System',
  'NPDES': 'National Pollutant Discharge Elimination System',
  'TMDL': 'Total Maximum Daily Load',
  'BMP': 'Best Management Practice',
  'LID': 'Low Impact Development',
  'GI': 'Green Infrastructure',

  // Finance & Budget
  'FY': 'Fiscal Year',
  'CIP': 'Capital Improvement Plan',
  'OPB': 'Operating Budget',
  'TA': 'Town Administrator',
  'CFO': 'Chief Financial Officer',
  'GFOA': 'Government Finance Officers Association',
  'OPEB': 'Other Post-Employment Benefits',
  'GASB': 'Governmental Accounting Standards Board',
  'AAA': 'Triple A Bond Rating',
  'GO': 'General Obligation',
  'BAN': 'Bond Anticipation Note',

  // Emergency & Safety
  'EOC': 'Emergency Operations Center',
  'EMS': 'Emergency Medical Services',
  'EMD': 'Emergency Management Director',
  'FEMA': 'Federal Emergency Management Agency',
  'MEMA': 'Massachusetts Emergency Management Agency',
  'LEPC': 'Local Emergency Planning Committee',
  'AED': 'Automated External Defibrillator',
  'PPE': 'Personal Protective Equipment',

  // Education
  'NIS': 'Nantucket Intermediate School',
  'NES': 'Nantucket Elementary School',
  'NHS': 'Nantucket High School',
  'SPED': 'Special Education',
  'IEP': 'Individualized Education Program',
  'DESE': 'Department of Elementary and Secondary Education',
  'MCAS': 'Massachusetts Comprehensive Assessment System',

  // Nantucket-Specific
  'NHEDC': 'Nantucket Housing and Economic Development Corporation',
  'NCH': 'Nantucket Cottage Hospital',
  'ACK': 'Nantucket Memorial Airport',
  'SSA': 'Steamship Authority',
  'HyLine': 'Hy-Line Cruises',
};

// =============================================================================
// CIVIC SYNONYM MAPPINGS
// =============================================================================

export const CIVIC_SYNONYMS: Record<string, string[]> = {
  // Housing terminology
  'affordable housing': ['workforce housing', 'low-income housing', 'subsidized housing', 'income-restricted housing', 'below-market housing'],
  'workforce housing': ['affordable housing', 'employee housing', 'moderate-income housing'],
  'housing trust': ['affordable housing trust', 'housing fund', 'housing authority'],
  'accessory dwelling': ['in-law apartment', 'ADU', 'granny flat', 'secondary dwelling'],

  // Government bodies
  'select board': ['selectmen', 'board of selectmen', 'selectboard', 'town board'],
  'selectmen': ['select board', 'board of selectmen'],
  'town meeting': ['annual town meeting', 'special town meeting', 'ATM', 'STM', 'town vote'],
  'planning board': ['planning commission', 'planning committee'],
  'conservation commission': ['concom', 'conservation board'],
  'finance committee': ['fincom', 'budget committee'],

  // Budget & Finance
  'budget': ['appropriation', 'funding', 'expenditure', 'fiscal', 'spending'],
  'appropriation': ['budget allocation', 'funding', 'budget item'],
  'tax rate': ['mil rate', 'tax levy', 'property tax rate', 'tax assessment'],
  'tax levy': ['property tax', 'tax rate', 'tax assessment'],
  'capital budget': ['capital improvement', 'CIP', 'capital expenditure', 'infrastructure budget'],
  'operating budget': ['annual budget', 'operating expenditure', 'day-to-day budget'],
  'free cash': ['surplus', 'reserves', 'fund balance'],
  'overlay': ['reserve fund', 'abatement fund'],

  // Zoning & Development
  'zoning': ['land use', 'zoning bylaw', 'zoning regulation', 'zoning ordinance'],
  'variance': ['special permit', 'zoning variance', 'exception', 'relief'],
  'special permit': ['conditional use permit', 'special exception', 'SUP'],
  'setback': ['building setback', 'yard requirement', 'buffer'],
  'lot coverage': ['building coverage', 'impervious coverage'],
  'subdivision': ['land division', 'lot split', 'development'],
  'site plan': ['development plan', 'building plan', 'project plan'],

  // Infrastructure
  'sewer': ['wastewater', 'sanitary system', 'sewage', 'wastewater system'],
  'water': ['water supply', 'water department', 'water main', 'drinking water', 'potable water'],
  'stormwater': ['drainage', 'runoff', 'storm drain', 'surface water'],
  'road': ['street', 'way', 'highway', 'roadway', 'pavement'],
  'sidewalk': ['walkway', 'pedestrian path', 'footpath'],

  // Environment
  'wetland': ['wetlands', 'marsh', 'bog', 'swamp', 'buffer zone'],
  'conservation': ['preservation', 'land protection', 'open space'],
  'open space': ['green space', 'parkland', 'conservation land', 'undeveloped land'],
  'historic': ['historical', 'heritage', 'landmark', 'preservation'],
  'coastal': ['waterfront', 'shoreline', 'beachfront', 'oceanfront'],

  // Meetings & Process
  'public hearing': ['hearing', 'public comment', 'testimony'],
  'vote': ['ballot', 'election', 'referendum', 'motion'],
  'article': ['warrant article', 'town meeting article', 'agenda item'],
  'warrant': ['town warrant', 'meeting warrant', 'agenda'],
  'motion': ['vote', 'resolution', 'proposal'],
  'amendment': ['revision', 'change', 'modification', 'update'],
  'bylaw': ['ordinance', 'regulation', 'law', 'rule'],

  // General civic
  'resident': ['citizen', 'taxpayer', 'voter', 'constituent', 'homeowner'],
  'property': ['real estate', 'land', 'parcel', 'lot'],
  'permit': ['license', 'approval', 'authorization'],
  'fee': ['charge', 'cost', 'assessment', 'payment'],
  'project': ['development', 'initiative', 'proposal', 'plan'],
};

// =============================================================================
// BROAD QUERY DETECTION
// =============================================================================

export interface BroadQueryResult {
  isBroad: boolean;
  suggestedRefinements: string[];
  defaultConstraint: string;
  broadTerm?: string;
}

const BROAD_TERM_REFINEMENTS: Record<string, string[]> = {
  'budget': ['FY2025 budget', 'school budget', 'capital budget', 'operating budget', 'budget vote'],
  'zoning': ['zoning changes', 'variance applications', 'zoning bylaw amendments', 'special permits'],
  'housing': ['affordable housing projects', 'housing trust', 'workforce housing', 'new housing developments'],
  'meeting': ['Select Board meetings', 'Town Meeting articles', 'Planning Board meetings', 'upcoming meetings'],
  'update': ['recent updates', 'project updates', 'policy updates', 'status updates'],
  'news': ['recent news', 'town announcements', 'latest developments'],
  'happening': ['recent meetings', 'current projects', 'ongoing discussions'],
  'going on': ['recent meetings', 'current projects', 'active discussions'],
  'water': ['water quality', 'water rates', 'water infrastructure', 'water department'],
  'sewer': ['sewer expansion', 'wastewater treatment', 'sewer assessments', 'sewer connection'],
  'school': ['school budget', 'school committee', 'school construction', 'enrollment'],
  'road': ['road repairs', 'road construction', 'street improvements', 'traffic'],
  'tax': ['tax rate', 'property tax', 'tax increase', 'tax assessment'],
  'development': ['new development', 'commercial development', 'residential development', 'development permits'],
  'permit': ['building permits', 'special permits', 'permit applications', 'permit fees'],
  'construction': ['new construction', 'building projects', 'construction permits', 'renovation'],
};

/**
 * Detect if query is overly broad and needs refinement
 */
export function detectBroadQuery(query: string): BroadQueryResult {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  // Very short queries (1-3 words) with generic terms are likely broad
  if (queryWords.length <= 3) {
    for (const [term, refinements] of Object.entries(BROAD_TERM_REFINEMENTS)) {
      if (queryLower.includes(term)) {
        return {
          isBroad: true,
          suggestedRefinements: refinements,
          defaultConstraint: 'recent',
          broadTerm: term,
        };
      }
    }
  }

  // "Tell me about X" or "What about X" patterns
  const vaguePhrasePatterns = [
    /^(?:tell me about|what about|what's|whats)\s+(?:the\s+)?(.+)$/i,
    /^(?:any(?:thing)?|info(?:rmation)?)\s+(?:on|about)\s+(.+)$/i,
  ];

  for (const pattern of vaguePhrasePatterns) {
    const match = queryLower.match(pattern);
    if (match) {
      const topic = match[1].trim();
      // Check if the extracted topic is itself a broad term
      for (const [term, refinements] of Object.entries(BROAD_TERM_REFINEMENTS)) {
        if (topic.includes(term) || term.includes(topic)) {
          return {
            isBroad: true,
            suggestedRefinements: refinements,
            defaultConstraint: 'recent',
            broadTerm: term,
          };
        }
      }
      // Generic vague query
      return {
        isBroad: true,
        suggestedRefinements: ['recent meetings', 'specific topics', 'particular dates'],
        defaultConstraint: 'recent',
      };
    }
  }

  return {
    isBroad: false,
    suggestedRefinements: [],
    defaultConstraint: '',
  };
}

// =============================================================================
// QUERY EXPANSION FUNCTIONS
// =============================================================================

export interface QueryExpansionResult {
  expandedQuery: string;
  expansions: string[];
  acronymsExpanded: string[];
  synonymsAdded: string[];
}

/**
 * Expand query with synonyms and acronym definitions
 * Returns the expanded query and list of expansions applied
 */
export function expandQuery(query: string): QueryExpansionResult {
  const expansions: string[] = [];
  const acronymsExpanded: string[] = [];
  const synonymsAdded: string[] = [];

  // 1. Expand acronyms (check both directions)
  for (const [acronym, fullForm] of Object.entries(CIVIC_ACRONYMS)) {
    // Case-insensitive match for acronym in query
    const acronymRegex = new RegExp(`\\b${acronym}\\b`, 'gi');
    if (acronymRegex.test(query)) {
      expansions.push(fullForm);
      acronymsExpanded.push(`${acronym} → ${fullForm}`);
    }

    // Also check if user typed full form, might want acronym matches too
    if (query.toLowerCase().includes(fullForm.toLowerCase())) {
      expansions.push(acronym);
      acronymsExpanded.push(`${fullForm} → ${acronym}`);
    }
  }

  // 2. Add synonym expansions
  const queryLower = query.toLowerCase();
  for (const [term, synonyms] of Object.entries(CIVIC_SYNONYMS)) {
    // Check if query contains the primary term
    if (queryLower.includes(term.toLowerCase())) {
      // Add top 2 synonyms to avoid over-expansion
      const toAdd = synonyms.slice(0, 2);
      expansions.push(...toAdd);
      synonymsAdded.push(`${term} → ${toAdd.join(', ')}`);
    }

    // Check if query matches any synonym
    for (const synonym of synonyms) {
      if (queryLower.includes(synonym.toLowerCase())) {
        // Add the primary term
        expansions.push(term);
        synonymsAdded.push(`${synonym} → ${term}`);
        break;
      }
    }
  }

  // 3. Build expanded query
  // Remove duplicates and limit expansions
  const uniqueExpansions = [...new Set(expansions)].slice(0, 5);

  let expandedQuery = query;
  if (uniqueExpansions.length > 0) {
    // Append expansions as context for better embedding
    expandedQuery = `${query} (related: ${uniqueExpansions.join(', ')})`;
  }

  logger.debug({
    originalQuery: query,
    expandedQuery,
    acronymsExpanded,
    synonymsAdded,
  }, '[QueryExpansion] Query expanded');

  return {
    expandedQuery,
    expansions: uniqueExpansions,
    acronymsExpanded,
    synonymsAdded,
  };
}

/**
 * Generate multiple query variants for parallel search
 * Used when query expansion alone isn't sufficient
 */
export function generateQueryVariants(query: string): string[] {
  const variants: string[] = [query];
  const queryLower = query.toLowerCase();

  // Add variants with key term substitutions
  for (const [term, synonyms] of Object.entries(CIVIC_SYNONYMS)) {
    if (queryLower.includes(term.toLowerCase())) {
      // Create variant with primary synonym
      const variant = query.replace(new RegExp(term, 'gi'), synonyms[0]);
      if (variant !== query && !variants.includes(variant)) {
        variants.push(variant);
      }
    }
  }

  // Add acronym variants
  for (const [acronym, fullForm] of Object.entries(CIVIC_ACRONYMS)) {
    const acronymRegex = new RegExp(`\\b${acronym}\\b`, 'gi');
    if (acronymRegex.test(query)) {
      const variant = query.replace(acronymRegex, fullForm);
      if (!variants.includes(variant)) {
        variants.push(variant);
      }
    }
  }

  return variants.slice(0, 3); // Limit to 3 variants
}
