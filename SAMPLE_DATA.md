# Sample Civic Documents for Testing

Use these sample structures to test the AckIndex application without real PDFs during development.

## Sample Document 1: Budget Report

```json
{
  "title": "FY2026 Nantucket Town Budget Proposal",
  "source": "Town Finance Department",
  "category": "Budget",
  "summary": "The FY2026 budget proposal represents a 5.2% increase over FY2025, driven primarily by infrastructure spending and personnel costs. Major allocations include $14.2M in capital projects, $4.7M for coastal resilience initiatives, and expanded funding for public schools. The proposal reflects the town's commitment to maintaining essential services while investing in long-term sustainability.\n\nThe Select Board will review the proposal throughout November and December, with public hearings scheduled for January. A final town vote is expected in spring 2026, following the annual town meeting.",
  "key_metrics": [
    { "label": "Total Budget", "value": "$128M" },
    { "label": "Increase from FY2025", "value": "5.2%" },
    { "label": "Capital Projects", "value": "$14.2M" },
    { "label": "Coastal Resilience", "value": "$4.7M" },
    { "label": "Education Funding", "value": "$42.3M" },
    { "label": "Infrastructure", "value": "$18.5M" }
  ],
  "visualizations": [
    {
      "type": "bar",
      "labels": ["FY2024", "FY2025", "FY2026"],
      "values": [115, 122, 128]
    },
    {
      "type": "pie",
      "labels": ["Education", "Infrastructure", "Public Safety", "Administration", "Other"],
      "values": [42.3, 18.5, 22.1, 15.6, 29.5]
    }
  ],
  "notable_updates": [
    "Proposed 3.5% increase for town employee salaries",
    "New line item for renewable energy initiatives ($2.1M)",
    "Expanded harbor maintenance budget by 12%",
    "Additional funding for affordable housing programs"
  ],
  "date_published": "2025-10-15"
}
```

## Sample Document 2: Real Estate Report

```json
{
  "title": "Q3 2025 Nantucket Real Estate Market Analysis",
  "source": "Nantucket Assessor's Office",
  "category": "Real Estate",
  "summary": "The third quarter of 2025 showed continued strength in Nantucket's real estate market, with median home prices reaching $2.8M, representing an 8.3% year-over-year increase. Transaction volume remained robust with 87 residential sales completed during the quarter. The luxury market (properties over $5M) saw particularly strong demand, accounting for 23% of total sales.\n\nAffordable housing remains a critical concern, with only 4.2% of sales occurring below $1M. The town continues to explore initiatives to increase workforce housing availability while managing development impacts on the island's character.",
  "key_metrics": [
    { "label": "Median Sale Price", "value": "$2.8M" },
    { "label": "YoY Price Increase", "value": "8.3%" },
    { "label": "Total Sales (Q3)", "value": "87" },
    { "label": "Average Days on Market", "value": "42" },
    { "label": "Inventory", "value": "156 homes" },
    { "label": "Sales > $5M", "value": "23%" }
  ],
  "visualizations": [
    {
      "type": "line",
      "labels": ["Q3 2024", "Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025"],
      "values": [2.58, 2.65, 2.71, 2.75, 2.80]
    },
    {
      "type": "bar",
      "labels": ["Under $1M", "$1M-$2M", "$2M-$5M", "Over $5M"],
      "values": [4, 28, 35, 20]
    }
  ],
  "notable_updates": [
    "New affordable housing development approved for Surfside Road",
    "Commercial real estate showing signs of recovery",
    "Rental market remains tight with <2% vacancy rate"
  ],
  "date_published": "2025-10-01"
}
```

## Sample Document 3: Town Meeting Minutes

```json
{
  "title": "Annual Town Meeting - October 2025 Highlights",
  "source": "Town Clerk's Office",
  "category": "Town Meeting",
  "summary": "The October 2025 Annual Town Meeting concluded after three sessions, with voters approving 42 of 48 articles. Key decisions included authorization for a new fire station, approval of the Community Preservation Act budget, and amendments to the Historic District Commission bylaws. Attendance averaged 312 registered voters across the sessions.\n\nDebates centered on balancing growth with preservation, affordable housing initiatives, and climate resilience measures. The meeting demonstrated strong community engagement with multiple citizen petitions and thoughtful discussion on complex policy matters.",
  "key_metrics": [
    { "label": "Articles Passed", "value": "42 of 48" },
    { "label": "Average Attendance", "value": "312 voters" },
    { "label": "Total Sessions", "value": "3" },
    { "label": "CPA Budget Approved", "value": "$3.2M" }
  ],
  "visualizations": [
    {
      "type": "donut",
      "labels": ["Passed", "Failed", "Postponed"],
      "values": [42, 4, 2]
    }
  ],
  "notable_updates": [
    "Article 12: New fire station authorized ($8.5M bond)",
    "Article 23: Short-term rental regulations strengthened",
    "Article 31: Community Preservation Act funding allocated",
    "Article 38: Climate resilience planning budget approved"
  ],
  "date_published": "2025-10-20"
}
```

## Sample Document 4: Infrastructure Update

```json
{
  "title": "Milestone Road Reconstruction Project Update",
  "source": "Department of Public Works",
  "category": "Infrastructure",
  "summary": "The Milestone Road reconstruction project has reached the 65% completion milestone, with major drainage improvements and road base work substantially finished. The $4.2M project is on schedule for completion by June 2026. Recent work has focused on utility coordination and preparing for the final paving layer.\n\nTraffic management has been adjusted based on community feedback, with improved signage and extended work hours to minimize disruption. The project represents one of the town's largest infrastructure investments in recent years.",
  "key_metrics": [
    { "label": "Completion", "value": "65%" },
    { "label": "Total Budget", "value": "$4.2M" },
    { "label": "Expected Finish", "value": "June 2026" },
    { "label": "Road Length", "value": "2.3 miles" }
  ],
  "visualizations": [
    {
      "type": "bar",
      "labels": ["Planning", "Drainage", "Base Work", "Paving", "Final"],
      "values": [100, 100, 80, 30, 0]
    }
  ],
  "notable_updates": [
    "Drainage system installation completed ahead of schedule",
    "Traffic detour working well with minimal complaints",
    "Additional bike lane width approved during construction",
    "Utility companies coordinating for minimal future disruption"
  ],
  "date_published": "2025-10-18"
}
```

## How to Use These Samples

### For Testing (Without AI)

Directly insert into Supabase:

```sql
INSERT INTO public.entries (
  title, source, category, summary, key_metrics, 
  visualizations, notable_updates, date_published
) VALUES (
  'FY2026 Nantucket Town Budget Proposal',
  'Town Finance Department',
  'Budget',
  '...',  -- Copy summary from above
  '[...]'::jsonb,  -- Copy key_metrics array
  '[...]'::jsonb,  -- Copy visualizations array
  '[...]'::jsonb,  -- Copy notable_updates array
  '2025-10-15'
);
```

### For AI Testing

Create simple text documents with this content and upload through the admin interface:

```
NANTUCKET TOWN BUDGET FY2026

Executive Summary

The FY2026 budget totals $128 million, a 5.2% increase from FY2025's $122 million. 

Key allocations:
- Capital Projects: $14.2M
- Coastal Resilience: $4.7M
- Education: $42.3M
- Infrastructure: $18.5M

[Continue with more details...]
```

Save as PDF and test the upload/parsing flow.
