'use server';

export type JobResult = {
  title?: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  job_id?: string;
  extensions?: string[];
  [key: string]: any;
};

export async function fetchMarketJobs(query: string): Promise<JobResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.error('SERPAPI_API_KEY is not defined in environment variables');
    throw new Error('Server configuration error: missing SERPAPI_API_KEY');
  }

  if (!query) {
    return [];
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_jobs');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', 'ja');
  url.searchParams.set('gl', 'jp');
  url.searchParams.set('api_key', apiKey);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'no-store', // uncomment if real-time freshness is critical and avoiding Next.js cache
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SerpApi error (${response.status}):`, errorText);
      throw new Error(`Failed to fetch from SerpApi: ${response.status}`);
    }

    const data = await response.json();
    return data.jobs_results || [];
  } catch (error) {
    console.error('Error fetching market jobs from SerpApi:', error);
    throw new Error('Failed to fetch market job data');
  }
}
